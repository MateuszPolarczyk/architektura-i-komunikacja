from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DashboardStatsView, ReservationViewSet

router = DefaultRouter()
router.register(r"reservations", ReservationViewSet, basename="reservation")

urlpatterns = [
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
] + router.urls
