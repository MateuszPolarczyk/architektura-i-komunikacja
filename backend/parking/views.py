from django.utils import timezone
from rest_framework import permissions, viewsets

from reservations.models import Reservation

from .models import Parking, ParkingSpot
from .serializers import (
    ParkingDetailSerializer,
    ParkingListSerializer,
    ParkingSpotSerializer,
)

class ParkingViewSet(viewsets.ReadOnlyModelViewSet):

    permission_classes = [permissions.AllowAny]
    filterset_fields = ["city"]
    search_fields = ["name", "address", "city"]
    ordering_fields = ["name", "hourly_rate"]

    def get_queryset(self):
        qs = Parking.objects.all().prefetch_related("spots")
        min_available = self.request.query_params.get("min_available")
        if min_available is not None:
            try:
                threshold = int(min_available)
            except ValueError:
                return qs
            now = timezone.now()
            ids = [
                p.id
                for p in qs
                if self._available_count(p, now) >= threshold
            ]
            qs = qs.filter(id__in=ids)
        return qs

    @staticmethod
    def _available_count(parking, now):
        busy = Reservation.objects.filter(
            spot__parking=parking,
            status=Reservation.Status.CONFIRMED,
            end_time__gt=now,
        ).values_list("spot_id", flat=True)
        return parking.spots.filter(is_active=True).exclude(id__in=busy).count()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ParkingDetailSerializer
        return ParkingListSerializer

class ParkingSpotViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = ParkingSpotSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["parking", "spot_type", "is_active"]

    def get_queryset(self):
        return ParkingSpot.objects.select_related("parking").all()
