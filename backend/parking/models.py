from django.db import models

class Parking(models.Model):

    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    hourly_rate = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text="Price per hour in PLN",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "parkings"

    def __str__(self):
        return self.name

    @property
    def total_spots(self):
        return self.spots.count()

class ParkingSpot(models.Model):

    class SpotType(models.TextChoices):
        STANDARD = "standard", "Standard"
        DISABLED = "disabled", "Disabled"
        ELECTRIC = "electric", "Electric (EV charger)"

    parking = models.ForeignKey(
        Parking, related_name="spots", on_delete=models.CASCADE
    )
    label = models.CharField(max_length=20, help_text="e.g. A-12")
    spot_type = models.CharField(
        max_length=20, choices=SpotType.choices, default=SpotType.STANDARD
    )
    is_active = models.BooleanField(
        default=True, help_text="Inactive spots cannot be reserved (e.g. maintenance)."
    )

    class Meta:
        ordering = ["parking", "label"]
        unique_together = ("parking", "label")

    def __str__(self):
        return f"{self.parking.name} / {self.label}"
