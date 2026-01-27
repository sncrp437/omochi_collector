from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from .views import (
    CustomTokenObtainPairViewByVenue,
    UserRegistrationAPIView,
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UserProfileView,
    AddressViewSet,
    UserLanguageAPIView,
    PasswordChangeView,
)

# Create a router for address viewset
address_router = DefaultRouter()
address_router.register(r'addresses', AddressViewSet, basename='addresses')

urlpatterns = [
    path('register/', UserRegistrationAPIView.as_view(), name='register'),
    path('login-user/', CustomTokenObtainPairView.as_view(), name='login_user'),
    path('login-venue/', CustomTokenObtainPairViewByVenue.as_view(), name='login_venue'),
    path('refresh-token/', TokenRefreshView.as_view(), name='token_refresh'),
    path('reset-password/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('reset-password/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', PasswordChangeView.as_view(), name='change_password'),
    path('me/', UserProfileView.as_view(), name='profile'),
    path('preferred-language/', UserLanguageAPIView.as_view(), name='user_language'),
    # Include address endpoints
    path('', include(address_router.urls)),
]