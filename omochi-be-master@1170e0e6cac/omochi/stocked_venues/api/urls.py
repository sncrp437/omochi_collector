from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StockedVenueViewSet

router = DefaultRouter()

router.register(r'', StockedVenueViewSet, basename='stocked-venues')


urlpatterns = [
    path('', include(router.urls)),
]
