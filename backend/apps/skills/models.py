"""Modèles des compétences, arbres et transactions de points (phases 1 et 2)."""

from uuid import uuid4

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class SkillPointTransactionKind(models.TextChoices):
    """Sens d'une transaction de points de compétence."""

    GAIN = "GAIN", "Gain"
    SPEND = "SPEND", "Dépense"


class SkillPointTransaction(models.Model):
    """Historique des points de compétence gagnés ou dépensés."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="skill_point_transactions",
    )
    amount = models.IntegerField()
    kind = models.CharField(
        max_length=10,
        choices=SkillPointTransactionKind.choices,
        default=SkillPointTransactionKind.GAIN,
    )
    reason = models.CharField(max_length=200, blank=True, default="")
    balance_after = models.PositiveIntegerField(default=0)
    xp_transaction = models.ForeignKey(
        "progression.XPTransaction",
        on_delete=models.PROTECT,
        related_name="skill_point_transactions",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.kind} : {self.amount} points"


class SkillTree(models.Model):
    """Arbre de compétences rattaché à un territoire."""

    territory = models.OneToOneField(
        "world.Territory",
        on_delete=models.CASCADE,
        related_name="skill_tree",
    )

    class Meta:
        ordering = ["territory__order"]

    def __str__(self) -> str:
        return f"Arbre : {self.territory.name}"


class SkillBranch(models.Model):
    """Branche d'un arbre de compétences."""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    tree = models.ForeignKey(
        SkillTree,
        on_delete=models.CASCADE,
        related_name="branches",
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["tree__territory__order", "order", "id"]

    def __str__(self) -> str:
        return self.name


class Skill(models.Model):
    """Compétence débloquable par le joueur."""

    code = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    branch = models.ForeignKey(
        SkillBranch,
        on_delete=models.CASCADE,
        related_name="skills",
    )
    tier = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    cost = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    requires = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="required_by",
    )
    min_territory_stat = models.PositiveIntegerField(default=0)
    min_validated_quests = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["branch__tree__territory__order", "branch__order", "tier", "id"]

    def __str__(self) -> str:
        return self.name


class SkillUnlock(models.Model):
    """Déblocage définitif d'une compétence pour un personnage."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="skill_unlocks",
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name="unlocks",
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)
    points_spent = models.PositiveIntegerField(default=0)
    transaction = models.OneToOneField(
        SkillPointTransaction,
        on_delete=models.PROTECT,
        related_name="skill_unlock",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["character", "skill"],
                name="unique_skill_unlock_per_character",
            ),
        ]
        ordering = ["unlocked_at"]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.skill.name}"
