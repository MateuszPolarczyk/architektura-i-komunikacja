from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

def api_root(_request):
    return JsonResponse(
        {
            "service": "ParkingSpot API",
            "endpoints": {
                "auth": "/api/auth/ (register, login, logout, refresh, me)",
                "parkings": "/api/parkings/",
                "spots": "/api/spots/",
                "reservations": "/api/reservations/",
                "admin": "/admin/",
            },
        }
    )

urlpatterns = [
    path("", api_root),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("parking.urls")),
    path("api/", include("reservations.urls")),
]
