from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import VenueViewSet, VenueQuestionsView
from .views_stripe_connect import (
    VenueStripeConnectView,
    StripeConnectOnboardingLinkView,
)

router = DefaultRouter()
router.register(r'', VenueViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Venue Order Questions endpoint
    path('<uuid:venue_id>/questions/', VenueQuestionsView.as_view(), name='venue-questions'),
    # Stripe Connect endpoints  
    path('<uuid:venue_id>/stripe-connect/', VenueStripeConnectView.as_view(), name='venue-stripe-connect'),
    path('<uuid:venue_id>/stripe-connect/onboarding-link/', StripeConnectOnboardingLinkView.as_view(), name='venue-stripe-connect-onboarding'),
]
