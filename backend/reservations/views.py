from django.utils import timezone
from rest_framework import decorators, mixins, response, status, views, viewsets

from parking.models import Parking, ParkingSpot

from .models import Reservation
from .serializers import ReservationCreateSerializer, ReservationSerializer

class DashboardStatsView(views.APIView):

    def get(self, request):
        now = timezone.now()
        busy_spot_ids = Reservation.objects.filter(
            status=Reservation.Status.CONFIRMED,
            end_time__gt=now,
        ).values_list("spot_id", flat=True)

        total_spots = ParkingSpot.objects.filter(is_active=True).count()
        available_spots = (
            ParkingSpot.objects.filter(is_active=True)
            .exclude(id__in=busy_spot_ids)
            .count()
        )
        user_reservations = Reservation.objects.filter(user=request.user)

        return response.Response(
            {
                "parkings": Parking.objects.count(),
                "total_spots": total_spots,
                "available_spots": available_spots,
                "my_active_reservations": user_reservations.filter(
                    status=Reservation.Status.CONFIRMED, end_time__gt=now
                ).count(),
                "my_total_reservations": user_reservations.count(),
            }
        )

class ReservationViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):

    def get_queryset(self):
        qs = (
            Reservation.objects.filter(user=self.request.user)
            .select_related("spot", "spot__parking")
        )
        scope = self.request.query_params.get("scope")
        now = timezone.now()
        if scope == "active":
            qs = qs.filter(status=Reservation.Status.CONFIRMED, end_time__gt=now)
        elif scope == "history":
            qs = qs.filter(status=Reservation.Status.CANCELLED) | qs.filter(
                end_time__lte=now
            )
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ReservationCreateSerializer
        return ReservationSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if instance.status == Reservation.Status.CANCELLED:
            return response.Response(
                {"detail": "Anulowanej rezerwacji nie można zmienić."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        out = ReservationSerializer(reservation, context=self.get_serializer_context())
        return response.Response(out.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        out = ReservationSerializer(reservation, context=self.get_serializer_context())
        return response.Response(out.data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status == Reservation.Status.CANCELLED:
            return response.Response(
                {"detail": "Rezerwacja jest już anulowana."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if reservation.end_time <= timezone.now():
            return response.Response(
                {"detail": "Nie można anulować rezerwacji, która już się zakończyła."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status"])
        out = ReservationSerializer(reservation, context=self.get_serializer_context())
        return response.Response(out.data, status=status.HTTP_200_OK)
