from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TimeSlotViewSet

router = DefaultRouter()

router.register(r"", TimeSlotViewSet, basename="time-slots")


urlpatterns = [
    path("", include(router.urls)),
]
