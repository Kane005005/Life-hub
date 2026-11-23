"""Vues de l'arbre de compétences et du déblocage."""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.skills.serializers import SkillTreeSerializer, SkillUnlockResponseSerializer
from engine.services import ensure_character
from engine.skills import skill_trees, unlock_skill


class SkillTreeListView(APIView):
    """Liste des arbres de compétences du personnage connecté."""

    @extend_schema(
        parameters=[
            OpenApiParameter(name="territory", type=str, location=OpenApiParameter.QUERY),
        ],
        responses=SkillTreeSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        """Renvoie les arbres de compétences, éventuellement filtrés par territoire."""
        character = ensure_character(request.user)
        territory = request.query_params.get("territory")
        return Response(skill_trees(character, territory=territory))


class SkillUnlockView(APIView):
    """Déblocage d'une compétence."""

    @extend_schema(request=None, responses=SkillUnlockResponseSerializer)
    def post(self, request: Request, code: str) -> Response:
        """Débloque la compétence demandée via le moteur."""
        character = ensure_character(request.user)
        result = unlock_skill(character, code)
        return Response(result)
