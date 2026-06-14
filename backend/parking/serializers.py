from django.utils import timezone
from rest_framework import serializers

from reservations.models import Reservation

from .models import Parking, ParkingSpot

class ParkingSpotSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = ParkingSpot
        fields = ("id", "label", "spot_type", "is_active", "status")

    def get_status(self, obj):
        if not obj.is_active:
            return "inactive"

        now = timezone.now()
        confirmed = obj.reservations.filter(status=Reservation.Status.CONFIRMED)
        if confirmed.filter(start_time__lte=now, end_time__gt=now).exists():
            return "occupied"
        if confirmed.filter(start_time__gt=now).exists():
            return "reserved"
        return "free"

class ParkingListSerializer(serializers.ModelSerializer):
    total_spots = serializers.IntegerField(read_only=True)
    available_spots = serializers.SerializerMethodField()

    class Meta:
        model = Parking
        fields = (
            "id", "name", "address", "city", "latitude", "longitude",
            "hourly_rate", "total_spots", "available_spots",
        )

    def get_available_spots(self, obj):
        now = timezone.now()
        busy_spot_ids = Reservation.objects.filter(
            spot__parking=obj,
            status=Reservation.Status.CONFIRMED,
            end_time__gt=now,
        ).values_list("spot_id", flat=True)
        return obj.spots.filter(is_active=True).exclude(id__in=busy_spot_ids).count()

class ParkingDetailSerializer(ParkingListSerializer):
    spots = ParkingSpotSerializer(many=True, read_only=True)

    class Meta(ParkingListSerializer.Meta):
        fields = ParkingListSerializer.Meta.fields + ("description", "spots")
