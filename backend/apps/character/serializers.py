"""Sérialiseurs du personnage, de son avatar et de son profil modifiable."""

from rest_framework import serializers

from apps.character.models import CharacterClass, Silhouette, color_validator
from apps.progression.serializers import RankSerializer, SkillPointsSerializer
from apps.world.serializers import TerritoryStatSerializer


class AvatarSerializer(serializers.Serializer):
    """Apparence minimaliste renvoyée dans le Character."""

    silhouette = serializers.CharField()
    color = serializers.CharField()
    accent = serializers.CharField()


class ShopItemSnapshotSerializer(serializers.Serializer):
    """Objet boutique/équipement renvoyé dans le personnage."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    slot = serializers.CharField(allow_null=True)
    cost = serializers.IntegerField()
    is_available = serializers.BooleanField()
    is_custom = serializers.BooleanField()
    visual = serializers.DictField()
    owned = serializers.BooleanField()
    equipped = serializers.BooleanField()
    purchases_count = serializers.IntegerField()


class EquipmentSerializer(serializers.Serializer):
    """Équipement cosmétique par emplacement."""

    AURA = ShopItemSnapshotSerializer(allow_null=True)
    FRAME = ShopItemSnapshotSerializer(allow_null=True)
    EMBLEM = ShopItemSnapshotSerializer(allow_null=True)


class CharacterSerializer(serializers.Serializer):
    """Objet Character complet du contrat d'API."""

    pseudonym = serializers.CharField()
    bio = serializers.CharField()
    character_class = serializers.CharField()
    is_onboarded = serializers.BooleanField()
    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_required = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    rank = RankSerializer()
    credits = serializers.IntegerField()
    skill_points = SkillPointsSerializer()
    avatar = AvatarSerializer()
    stats = TerritoryStatSerializer(many=True)
    active_title = serializers.CharField(allow_null=True)
    titles = serializers.ListField(child=serializers.CharField())
    equipment = EquipmentSerializer()


class CharacterUpdateSerializer(serializers.Serializer):
    """Champs de profil modifiables ; la progression est ignorée."""

    pseudonym = serializers.CharField(max_length=40, required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    character_class = serializers.ChoiceField(choices=CharacterClass.choices, required=False)
    is_onboarded = serializers.BooleanField(required=False)
    active_title = serializers.CharField(
        max_length=80, required=False, allow_blank=True, allow_null=True
    )


class AvatarUpdateSerializer(serializers.Serializer):
    """Champs de l'avatar acceptés en PATCH."""

    silhouette = serializers.ChoiceField(choices=Silhouette.choices, required=False)
    color = serializers.CharField(required=False, validators=[color_validator])
    accent = serializers.CharField(required=False, validators=[color_validator])
