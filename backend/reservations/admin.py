from django.contrib import admin

from .models import Reservation

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "spot", "start_time", "end_time", "status")
    list_filter = ("status", "spot__parking")
    search_fields = ("user__email", "spot__label", "spot__parking__name")
    date_hierarchy = "start_time"
