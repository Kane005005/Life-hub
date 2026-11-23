"""Routes du calendrier, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "planning"

urlpatterns = [
    path("calendar/", views.CalendarRangeView.as_view(), name="calendar-range"),
    path("calendar/today/", views.CalendarTodayView.as_view(), name="calendar-today"),
    path("agent/calendar/", views.AgentCalendarView.as_view(), name="agent-calendar"),
]
