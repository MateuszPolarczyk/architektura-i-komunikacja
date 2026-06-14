from django.utils import timezone
from rest_framework import serializers

from parking.models import ParkingSpot

from .models import Reservation

class ReservationSerializer(serializers.ModelSerializer):

    spot_label = serializers.CharField(source="spot.label", read_only=True)
    parking_id = serializers.IntegerField(source="spot.parking_id", read_only=True)
    parking_name = serializers.CharField(source="spot.parking.name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id", "spot", "spot_label", "parking_id", "parking_name",
            "start_time", "end_time", "status", "is_active", "created_at",
        )
        read_only_fields = ("status", "created_at")

class ReservationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ("id", "spot", "start_time", "end_time")

    def validate_spot(self, spot):
        if not spot.is_active:
            raise serializers.ValidationError(
                "To miejsce nie jest dostępne do rezerwacji."
            )
        return spot

    def validate(self, attrs):

        inst = self.instance
        start = attrs.get("start_time", getattr(inst, "start_time", None))
        end = attrs.get("end_time", getattr(inst, "end_time", None))
        spot = attrs.get("spot", getattr(inst, "spot", None))

        if start >= end:
            raise serializers.ValidationError(
                {"end_time": "Czas zakończenia musi być późniejszy niż czas rozpoczęcia."}
            )
        if end <= timezone.now():
            raise serializers.ValidationError(
                {"start_time": "Nie można zarezerwować miejsca w przeszłości."}
            )

        overlapping = Reservation.objects.filter(
            spot=spot,
            status=Reservation.Status.CONFIRMED,
            start_time__lt=end,
            end_time__gt=start,
        )
        if self.instance is not None:
            overlapping = overlapping.exclude(pk=self.instance.pk)
        if overlapping.exists():
            raise serializers.ValidationError(
                "To miejsce jest już zarezerwowane w wybranym przedziale czasu."
            )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
