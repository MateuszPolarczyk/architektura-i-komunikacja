from rest_framework.routers import DefaultRouter

from .views import ParkingSpotViewSet, ParkingViewSet

router = DefaultRouter()
router.register(r"parkings", ParkingViewSet, basename="parking")
router.register(r"spots", ParkingSpotViewSet, basename="spot")

urlpatterns = router.urls
