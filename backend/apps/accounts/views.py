"""Vues d'authentification : connexion, déconnexion et identité."""

from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import (
    LoginResponseSerializer,
    LoginSerializer,
    MeSerializer,
    UserSerializer,
)


class LoginView(APIView):
    """Vérifie les identifiants et renvoie un jeton DRF."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses=LoginResponseSerializer)
    def post(self, request: Request) -> Response:
        """Crée ou récupère le jeton du compte après authentification."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            raise ValidationError({"detail": "Identifiants incorrects."})
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    """Révoque le jeton utilisé pour la requête."""

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        """Supprime le jeton courant et renvoie une réponse vide."""
        if isinstance(request.auth, Token):
            request.auth.delete()
        else:
            Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Renvoie l'identité du compte authentifié et gère son fuseau horaire."""

    @extend_schema(operation_id="me_retrieve", responses=MeSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie l'identifiant, le nom et le fuseau de l'utilisateur."""
        return Response(MeSerializer(request.user).data)

    @extend_schema(operation_id="me_update", request=MeSerializer, responses=MeSerializer)
    def patch(self, request: Request) -> Response:
        """Modifie uniquement le fuseau horaire du compte."""
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
