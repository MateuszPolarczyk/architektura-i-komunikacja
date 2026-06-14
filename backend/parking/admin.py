from django.contrib import admin

from .models import Parking, ParkingSpot

class ParkingSpotInline(admin.TabularInline):
    model = ParkingSpot
    extra = 0

@admin.register(Parking)
class ParkingAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "address", "hourly_rate", "total_spots")
    search_fields = ("name", "address", "city")
    inlines = [ParkingSpotInline]

@admin.register(ParkingSpot)
class ParkingSpotAdmin(admin.ModelAdmin):
    list_display = ("label", "parking", "spot_type", "is_active")
    list_filter = ("spot_type", "is_active", "parking")
    search_fields = ("label", "parking__name")
