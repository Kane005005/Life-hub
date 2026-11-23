"""Vues des jetons d'agent, du contexte agent et des propositions de missions."""

from django.db.models import Case, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT
from rest_framework.views import APIView

from apps.ai_engine.models import AgentToken, ProposalStatus, QuestProposal
from apps.ai_engine.serializers import (
    AgentContextSerializer,
    AgentTokenCreateResponseSerializer,
    AgentTokenCreateSerializer,
    AgentTokenSerializer,
    ProposalAcceptResponseSerializer,
    ProposalRejectInputSerializer,
    QuestProposalBatchSerializer,
    QuestProposalInputSerializer,
    QuestProposalSerializer,
    QuestProposalUpdateSerializer,
)
from apps.quests.serializers import QuestSerializer
from config.permissions import HasAgentScope, IsAgent
from engine.agents import (
    accept_proposal,
    agent_context,
    create_agent_token,
    create_proposals,
    reject_proposal,
    revoke_agent_token,
    update_proposal,
)


class AgentTokenListCreateView(APIView):
    """Liste et création des jetons d'agent de l'utilisateur connecté."""

    @extend_schema(operation_id="agent_tokens_list", responses=AgentTokenSerializer(many=True))
    def get(self, request: Request) -> Response:
        """Renvoie tous les jetons du compte, révoqués compris, sans secret."""
        tokens = AgentToken.objects.filter(owner=request.user)
        return Response(AgentTokenSerializer(tokens, many=True).data)

    @extend_schema(
        operation_id="agent_tokens_create",
        request=AgentTokenCreateSerializer,
        responses={201: AgentTokenCreateResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        """Crée un jeton ; le secret complet n'est renvoyé qu'à la création."""
        serializer = AgentTokenCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token, secret = create_agent_token(
            request.user,
            serializer.validated_data["name"],
            serializer.validated_data.get("scopes"),
        )
        data = AgentTokenSerializer(token).data
        data["token"] = secret
        return Response(data, status=HTTP_201_CREATED)


class AgentTokenDetailView(APIView):
    """Révocation d'un jeton d'agent ; rien n'est jamais supprimé."""

    @extend_schema(operation_id="agent_tokens_revoke", request=None, responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        """Révoque le jeton (204) ; il reste listé avec is_active à false."""
        token = get_object_or_404(AgentToken, pk=pk, owner=request.user)
        revoke_agent_token(token)
        return Response(status=HTTP_204_NO_CONTENT)


class AgentContextView(APIView):
    """Contexte de jeu borné, réservé aux agents authentifiés par jeton."""

    permission_classes = [IsAgent, HasAgentScope]

    @extend_schema(operation_id="agent_context", responses=AgentContextSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le contexte selon les portées du jeton, sans BODY sans portée body."""
        return Response(agent_context(request.auth))


class AgentQuestProposalListCreateView(APIView):
    """Propositions de l'agent : ses propres propositions et leur statut."""

    permission_classes = [IsAgent, HasAgentScope]
    required_scope = "proposals"

    @extend_schema(
        operation_id="agent_proposals_list",
        responses=QuestProposalSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        """Renvoie les propositions créées par ce jeton, des plus récentes aux plus anciennes."""
        proposals = QuestProposal.objects.filter(token=request.auth)
        return Response(QuestProposalSerializer(proposals, many=True).data)

    @extend_schema(
        operation_id="agent_proposals_create",
        description=(
            'Une proposition (objet) ou plusieurs via {"proposals": [...]} (10 max). '
            "Les champs serveur (status, xp_preview, quest…) sont ignorés."
        ),
        request=QuestProposalInputSerializer,
        responses={201: QuestProposalSerializer(many=True)},
    )
    def post(self, request: Request) -> Response:
        """Crée 1 à 10 propositions en attente de décision de l'utilisateur."""
        if isinstance(request.data, dict) and "proposals" in request.data:
            serializer = QuestProposalBatchSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            items = serializer.validated_data["proposals"]
        else:
            serializer = QuestProposalInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            items = [serializer.validated_data]
        proposals = create_proposals(request.auth, items)
        return Response(
            QuestProposalSerializer(proposals, many=True).data,
            status=HTTP_201_CREATED,
        )


class QuestProposalListView(ListAPIView):
    """Liste paginée des propositions de l'utilisateur, en attente d'abord."""

    serializer_class = QuestProposalSerializer

    @extend_schema(
        operation_id="quest_proposals_list",
        parameters=[OpenApiParameter(name="status", type=str, location=OpenApiParameter.QUERY)],
        responses=QuestProposalSerializer(many=True),
    )
    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Renvoie les propositions du compte, filtrables par statut."""
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        """Filtre sur le compte et le statut ; les propositions en attente passent devant."""
        queryset = QuestProposal.objects.filter(owner=self.request.user)
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset.annotate(
            pending_order=Case(
                When(status=ProposalStatus.PENDING, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by("pending_order", "-created_at", "-id")


class QuestProposalDetailView(APIView):
    """Modification d'une proposition en attente par l'utilisateur."""

    @extend_schema(
        operation_id="quest_proposals_update",
        request=QuestProposalUpdateSerializer,
        responses=QuestProposalSerializer,
    )
    def patch(self, request: Request, pk: int) -> Response:
        """Modifie une proposition en attente ; 409 si elle est déjà décidée."""
        proposal = get_object_or_404(QuestProposal, pk=pk, owner=request.user)
        serializer = QuestProposalUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        proposal = update_proposal(proposal, serializer.validated_data)
        return Response(QuestProposalSerializer(proposal).data)


class QuestProposalAcceptView(APIView):
    """Acceptation d'une proposition : crée la mission via le Life Engine."""

    @extend_schema(
        operation_id="quest_proposals_accept",
        request=QuestProposalUpdateSerializer,
        responses=ProposalAcceptResponseSerializer,
    )
    def post(self, request: Request, pk: int) -> Response:
        """Accepte avec modifications facultatives ; la mission ne rapporte rien encore."""
        proposal = get_object_or_404(QuestProposal, pk=pk, owner=request.user)
        overrides: dict = {}
        if request.data:
            serializer = QuestProposalUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            overrides = serializer.validated_data
        proposal, quest = accept_proposal(request.user, proposal, overrides=overrides)
        return Response(
            {
                "proposal": QuestProposalSerializer(proposal).data,
                "quest": QuestSerializer(quest).data,
            }
        )


class QuestProposalRejectView(APIView):
    """Refus d'une proposition par l'utilisateur."""

    @extend_schema(
        operation_id="quest_proposals_reject",
        request=ProposalRejectInputSerializer,
        responses=QuestProposalSerializer,
    )
    def post(self, request: Request, pk: int) -> Response:
        """Refuse la proposition avec un motif facultatif ; 409 si déjà décidée."""
        proposal = get_object_or_404(QuestProposal, pk=pk, owner=request.user)
        serializer = ProposalRejectInputSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        proposal = reject_proposal(
            request.user,
            proposal,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(QuestProposalSerializer(proposal).data)
