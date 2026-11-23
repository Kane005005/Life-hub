"""Sérialiseurs des jetons d'agent, du contexte et des propositions de missions."""

from rest_framework import serializers

from apps.ai_engine.models import AgentToken, QuestProposal
from apps.analytics.serializers import EnergyCheckInSerializer, InsightsSerializer
from apps.progression.serializers import RankSerializer
from apps.quests.models import Difficulty, Priority, QuestType
from apps.quests.serializers import QuestSerializer, QuestStepInputSerializer
from apps.seasons.serializers import SeasonSerializer
from apps.world.models import Territory
from apps.world.serializers import TerritoryStatSerializer
from engine.agents import SCOPES


class AgentTokenSerializer(serializers.ModelSerializer):
    """Jeton d'agent renvoyé par l'API, sans le secret ni son empreinte."""

    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = AgentToken
        fields = (
            "id",
            "name",
            "prefix",
            "scopes",
            "created_at",
            "last_used_at",
            "revoked_at",
            "is_active",
        )
        read_only_fields = (
            "id",
            "name",
            "prefix",
            "scopes",
            "created_at",
            "last_used_at",
            "revoked_at",
        )


class AgentTokenCreateSerializer(serializers.Serializer):
    """Données acceptées à la création d'un jeton ; portées inconnues refusées."""

    name = serializers.CharField(max_length=60)
    scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=[(scope, scope) for scope in SCOPES]),
        required=False,
    )

    def validate_name(self, value: str) -> str:
        """Refuse un nom vide ou composé uniquement d'espaces."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom du jeton est requis.")
        return value


class AgentTokenCreateResponseSerializer(AgentTokenSerializer):
    """Réponse de création : le secret complet n'apparaît qu'une seule fois."""

    token = serializers.CharField()

    class Meta(AgentTokenSerializer.Meta):
        fields = (*AgentTokenSerializer.Meta.fields, "token")


class QuestProposalSerializer(serializers.ModelSerializer):
    """Proposition de mission, avec les champs calculés par le serveur."""

    class Meta:
        model = QuestProposal
        fields = (
            "id",
            "uuid",
            "agent_name",
            "status",
            "title",
            "description",
            "rationale",
            "territory",
            "quest_type",
            "difficulty",
            "priority",
            "estimated_minutes",
            "due_date",
            "skill_branch",
            "steps",
            "xp_preview",
            "quest",
            "decided_at",
            "reject_reason",
            "created_at",
        )
        read_only_fields = fields


class QuestProposalInputSerializer(serializers.Serializer):
    """Champs acceptés d'une proposition ; les champs serveur sont ignorés."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    territory = serializers.CharField(max_length=20)
    quest_type = serializers.ChoiceField(choices=QuestType.choices, default=QuestType.SIDE)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, default=Difficulty.MEDIUM)
    priority = serializers.ChoiceField(choices=Priority.choices, default=Priority.NORMAL)
    estimated_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    due_date = serializers.DateField(required=False, allow_null=True)
    skill_branch = serializers.CharField(
        max_length=40, required=False, allow_blank=True, default=""
    )
    steps = QuestStepInputSerializer(many=True, required=False, default=list)
    rationale = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_territory(self, value: str) -> str:
        """Refuse un code de territoire inconnu."""
        if not Territory.objects.filter(code=value).exists():
            raise serializers.ValidationError("Territoire inconnu.")
        return value


class QuestProposalBatchSerializer(serializers.Serializer):
    """Envoi groupé : 1 à 10 propositions dans la clé « proposals »."""

    proposals = serializers.ListField(
        child=QuestProposalInputSerializer(),
        min_length=1,
        max_length=10,
    )


class QuestProposalUpdateSerializer(serializers.Serializer):
    """Champs modifiables d'une proposition en attente."""

    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    territory = serializers.CharField(max_length=20, required=False)
    quest_type = serializers.ChoiceField(choices=QuestType.choices, required=False)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, required=False)
    priority = serializers.ChoiceField(choices=Priority.choices, required=False)
    estimated_minutes = serializers.IntegerField(required=False, min_value=0)
    due_date = serializers.DateField(required=False, allow_null=True)
    skill_branch = serializers.CharField(max_length=40, required=False, allow_blank=True)
    steps = QuestStepInputSerializer(many=True, required=False)
    rationale = serializers.CharField(required=False, allow_blank=True)

    def validate_territory(self, value: str) -> str:
        """Refuse un code de territoire inconnu."""
        if not Territory.objects.filter(code=value).exists():
            raise serializers.ValidationError("Territoire inconnu.")
        return value


class ProposalRejectInputSerializer(serializers.Serializer):
    """Motif facultatif joint au refus d'une proposition."""

    reason = serializers.CharField(required=False, allow_blank=True, default="")


class ProposalAcceptResponseSerializer(serializers.Serializer):
    """Réponse d'acceptation : la proposition décidée et la mission créée."""

    proposal = QuestProposalSerializer()
    quest = QuestSerializer()


class AgentProfileSerializer(serializers.Serializer):
    """Profil minimal lisible avec la portée profile."""

    pseudonym = serializers.CharField()
    character_class = serializers.CharField()
    level = serializers.IntegerField()
    rank = RankSerializer()
    active_title = serializers.CharField(allow_null=True)


class AgentProgressionSerializer(serializers.Serializer):
    """Progression lisible avec la portée progression."""

    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_required = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    territories = TerritoryStatSerializer(many=True)
    insights = InsightsSerializer()


class AgentActiveQuestSerializer(serializers.Serializer):
    """Mission active résumée pour le contexte d'agent."""

    id = serializers.IntegerField()
    title = serializers.CharField()
    territory = serializers.CharField()
    quest_type = serializers.CharField()
    difficulty = serializers.CharField()
    status = serializers.CharField()
    due_date = serializers.DateField(allow_null=True)
    skill_branch = serializers.CharField()


class AgentRecentCompletionSerializer(serializers.Serializer):
    """Validation récente résumée pour le contexte d'agent."""

    title = serializers.CharField()
    territory = serializers.CharField()
    completed_at = serializers.DateTimeField()


class AgentQuestsSerializer(serializers.Serializer):
    """Missions actives et validations récentes, bornées."""

    active = AgentActiveQuestSerializer(many=True)
    recent_completions = AgentRecentCompletionSerializer(many=True)


class AgentUnlockedSkillSerializer(serializers.Serializer):
    """Compétence débloquée, résumée pour le contexte d'agent."""

    code = serializers.CharField()
    name = serializers.CharField()
    territory = serializers.CharField()


class AgentContextBranchSerializer(serializers.Serializer):
    """Branche de compétences résumée, sans le détail des nœuds."""

    code = serializers.CharField()
    name = serializers.CharField()
    validated_quests = serializers.IntegerField()


class AgentContextTreeSerializer(serializers.Serializer):
    """Arbre de compétences résumé pour le contexte d'agent."""

    territory = serializers.CharField()
    branches = AgentContextBranchSerializer(many=True)


class AgentSkillsSerializer(serializers.Serializer):
    """Compétences lisibles avec la portée skills."""

    available_points = serializers.IntegerField()
    unlocked = AgentUnlockedSkillSerializer(many=True)
    trees = AgentContextTreeSerializer(many=True)


class AgentSeasonsSerializer(serializers.Serializer):
    """Saison active lisible avec la portée seasons."""

    current = SeasonSerializer(allow_null=True)


class AgentJournalEntrySerializer(serializers.Serializer):
    """Événement du journal résumé pour le contexte d'agent."""

    event_type = serializers.CharField()
    message = serializers.CharField()
    created_at = serializers.DateTimeField()


class AgentProposalsSummarySerializer(serializers.Serializer):
    """File d'attente des propositions, lisible avec la portée proposals."""

    pending = serializers.IntegerField()


class AgentContextSerializer(serializers.Serializer):
    """Contexte borné d'un agent : seules les clés de ses portées sont présentes."""

    agent = serializers.CharField()
    scopes = serializers.ListField(child=serializers.CharField())
    generated_at = serializers.DateTimeField()
    profile = AgentProfileSerializer(required=False)
    progression = AgentProgressionSerializer(required=False)
    quests = AgentQuestsSerializer(required=False)
    skills = AgentSkillsSerializer(required=False)
    seasons = AgentSeasonsSerializer(required=False)
    journal = AgentJournalEntrySerializer(many=True, required=False)
    energy = EnergyCheckInSerializer(many=True, required=False)
    proposals = AgentProposalsSummarySerializer(required=False)
