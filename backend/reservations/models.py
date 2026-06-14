from django.conf import settings
from django.db import models
from django.utils import timezone

class Reservation(models.Model):

    class Status(models.TextChoices):
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reservations",
        on_delete=models.CASCADE,
    )
    spot = models.ForeignKey(
        "parking.ParkingSpot",
        related_name="reservations",
        on_delete=models.CASCADE,
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONFIRMED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_time"]
        indexes = [
            models.Index(fields=["spot", "status", "start_time", "end_time"]),
        ]

    def __str__(self):
        return f"{self.user} @ {self.spot} ({self.start_time:%Y-%m-%d %H:%M})"

    @property
    def is_active(self):
        return self.status == self.Status.CONFIRMED and self.end_time > timezone.now()
