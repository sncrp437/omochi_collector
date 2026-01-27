from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ReservationStatusHistoryViewSet, 
    ReservationViewSet,
    UserReservationViewSet
)

# Create separate routers for each viewset
reservation_router = DefaultRouter()
reservation_router.register(r'', ReservationViewSet, basename='reservations')

# Define a direct view for my-reservations
# Make sure we have a viewset that specifically handles listing user reservations
my_reservations_view = UserReservationViewSet.as_view({
    'get': 'list',
})

reservation_status_history_list = ReservationStatusHistoryViewSet.as_view(
    {'get': 'list'}
)

urlpatterns = [
    path(
        'my-reservations/',
        my_reservations_view,
        name='my-reservations',
    ),
    path(
        '<uuid:reservation_id>/status-history/',
        reservation_status_history_list,
        name='reservation-status-history-list',
    ),
    # This should be last to avoid catching other specific paths
    path('', include(reservation_router.urls)),
]
