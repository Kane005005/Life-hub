"""Routes des agents et des propositions, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "ai_engine"

urlpatterns = [
    path("auth/agent-tokens/", views.AgentTokenListCreateView.as_view(), name="agent-tokens"),
    path(
        "auth/agent-tokens/<int:pk>/",
        views.AgentTokenDetailView.as_view(),
        name="agent-token-detail",
    ),
    path("agent/context/", views.AgentContextView.as_view(), name="agent-context"),
    path(
        "agent/quest-proposals/",
        views.AgentQuestProposalListCreateView.as_view(),
        name="agent-proposals",
    ),
    path("quest-proposals/", views.QuestProposalListView.as_view(), name="proposals"),
    path(
        "quest-proposals/<int:pk>/",
        views.QuestProposalDetailView.as_view(),
        name="proposal-detail",
    ),
    path(
        "quest-proposals/<int:pk>/accept/",
        views.QuestProposalAcceptView.as_view(),
        name="proposal-accept",
    ),
    path(
        "quest-proposals/<int:pk>/reject/",
        views.QuestProposalRejectView.as_view(),
        name="proposal-reject",
    ),
]
