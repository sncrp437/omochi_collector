from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse, OpenApiParameter
from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils.translation import gettext_lazy as _

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserProfileUpdateSerializer,
    LoginResponseSerializer,
    AddressSerializer,
    UserLanguageSerializer,
    PasswordChangeSerializer,
)
from omochi.users.models import Address, User, PasswordResetToken
from django.utils import timezone
from django.conf import settings
from omochi.common.direct_email_service import email_service
from omochi.common.multilingual_service import MultilingualService, SupportedLanguage
import secrets
import datetime


class UserRegistrationAPIView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer
    
    @extend_schema(
        operation_id="register_user",
        summary="Register a new user",
        description="Creates a new user account with the provided information including address details",
        responses={
            201: OpenApiResponse(
                response=UserSerializer,
                description="User registration successful"
            ),
            400: OpenApiResponse(
                description="Bad request, validation error"
            )
        },
        examples=[
            OpenApiExample(
                "Registration Example",
                summary="Sample registration data",
                value={
                    "email": "user@example.com",
                    "phone_number": "01234567890",
                    "first_name": "John",
                    "last_name": "Doe",
                    "password": "securePassword123",
                    "password_confirm": "securePassword123",
                    "ref_code": "ABC12345",
                    "address": {
                        "prefecture": "Tokyo",
                        "city": "Shibuya",
                        "detail": "1-2-3 Shibuya"
                    }
                },
                request_only=True
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    @extend_schema(
        operation_id="login",
        summary="Login and get JWT token",
        description="Authenticate a user and return JWT tokens with user data",
        responses={
            200: OpenApiResponse(
                description="Login successful, tokens provided",
                response=LoginResponseSerializer
            ),
            401: OpenApiResponse(
                description="Invalid credentials"
            )
        },
        examples=[
            OpenApiExample(
                "Login Example",
                summary="Sample login data",
                value={
                    "email": "user@example.com",
                    "password": "securePassword123"
                },
                request_only=True
            ),
        ]
    )
    def post(self, request, *args, **kwargs):
        data = request.data
        user = User.objects.filter(email=data['email'].lower()).first()
        if user and user.managed_venues.all().exists():
            return Response(
                {"detail": "No active account found with the given credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().post(request, *args, **kwargs)


class CustomTokenObtainPairViewByVenue(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    @extend_schema(
        operation_id="login",
        summary="Login and get JWT token",
        description="Authenticate a user and return JWT tokens with user data",
        responses={
            200: OpenApiResponse(
                description="Login successful, tokens provided",
                response=LoginResponseSerializer
            ),
            401: OpenApiResponse(
                description="Invalid credentials"
            )
        },
        examples=[
            OpenApiExample(
                "Login Example",
                summary="Sample login data",
                value={
                    "email": "user@example.com",
                    "password": "securePassword123"
                },
                request_only=True
            ),
        ]
    )
    def post(self, request, *args, **kwargs):
        data = request.data
        user = User.objects.filter(email=data['email'].lower()).first()
        if user and not user.managed_venues.all().exists():
            return Response(
                {"detail": "No active account found with the given credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().post(request, *args, **kwargs)

# Request password reset
class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PasswordResetRequestSerializer
    
    @extend_schema(
        operation_id="request_password_reset",
        summary="Request password reset",
        description="Sends a password reset email to the provided email address",
        responses={
            200: OpenApiResponse(
                description="Password reset email sent",
                response={
                    "type": "object",
                    "properties": {
                        "message": {"type": "string", "description": "Confirmation message"}
                    }
                },
            ),
            404: OpenApiResponse(
                description="Email not found"
            )
        }
    )


    # NOTE: To optimize IP queries, add an index on (ip, created_at) in PasswordResetToken model.

    # check rate limit: return 'email' or 'ip' if limit hit, else None 
    def _check_rate_limit(self, email, ip):
        now = timezone.now()
        window = now - datetime.timedelta(seconds=60)

        # Email: 1 per 60s (unused, not expired)
        recent_email_token = PasswordResetToken.objects.filter(
            user__email=email,
            created_at__gte=window
        ).exists()
        if recent_email_token:
            return 'email'

        # IP: 5 per 60s
        ip_count = PasswordResetToken.objects.filter(
            ip=ip,
            created_at__gte=window
        ).count()
        if ip_count >= 5:
            return 'ip'
        return None

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')

        # Rate limiting
        limit_hit = self._check_rate_limit(email, ip)
        if limit_hit == 'email':
            return Response(
                {"detail": _("You’ve recently requested a password reset for this email. Please wait a minute before trying again.")},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        if limit_hit == 'ip':
            return Response(
                {"detail": _("You’ve made too many password reset requests. Please wait a moment before trying again.")},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": _("No user found with the provided email address.")},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for existing valid token
        now = timezone.now()
        token_lifetime = datetime.timedelta(minutes=10)
        token_obj = PasswordResetToken.objects.filter(user=user, used=False, expires_at__gt=now).first()
        if not token_obj:
            # Generate new token
            token = secrets.token_urlsafe(32)
            expires_at = now + token_lifetime
            # Save IP in token for rate limiting
            token_obj = PasswordResetToken.objects.create(user=user, token=token, expires_at=expires_at, ip=ip)
        else:
            # If reusing token, update IP if not set (for legacy tokens)
            if not getattr(token_obj, 'ip', None):
                token_obj.ip = ip
                token_obj.save(update_fields=['ip'])

        # Determine role for reset link
        role = 'venue' if hasattr(user, 'managed_venues') and user.managed_venues.exists() else 'user'
        reset_link = f"{getattr(settings, 'FRONTEND_URL', 'https://omochiapp.com')}/reset-password?token={token_obj.token}&role={role}"

        # Multilingual: only for user role, use MultilingualService.get_current_language
        language = 'ja'
        if role == 'user':
            lang = MultilingualService.get_current_language(request)
            language = 'en' if lang == SupportedLanguage.ENGLISH else 'ja'

        email_service.send_password_reset_email(
            recipient_email=user.email,
            reset_link=reset_link,
            user_name=user.get_full_name() or user.email,
            language=language
        )

        return Response(
            {
                "message": _("We have sent a link to your email. Please check your inbox and set a new password."),
            },
            status=status.HTTP_200_OK,
        )

# Confirm password reset
class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = PasswordResetConfirmSerializer
    
    @extend_schema(
        operation_id="confirm_password_reset",
        summary="Confirm password reset",
        description="Resets the user's password using the provided token",
        responses={
            200: OpenApiResponse(
                description="Password reset successful"
            ),
            400: OpenApiResponse(
                description="Invalid token or password mismatch"
            )
        }
    )
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        # Find token
        token_obj = PasswordResetToken.objects.filter(token=token).first()

        if not token_obj or not token_obj.is_valid():
            return Response(
                {"detail": _("The link has expired. Please try resetting your password again.")},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = token_obj.user
        user.set_password(new_password)
        user.save()
        token_obj.mark_used()

        return Response(
            {"message": _("Your password has been successfully updated!")},
            status=status.HTTP_200_OK
        )

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserSerializer
    
    @extend_schema(
        operation_id="get_user_profile",
        summary="Get current user profile",
        description="Returns the profile of the currently authenticated user",
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description="Authentication required")
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update user profile",
        description="Updates only the name and avatar of the currently authenticated user",
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required")
        },
        examples=[
            OpenApiExample(
                "Update Example",
                summary="Sample update data",
                request_only=True
            )
        ]
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    def get_object(self):
        return self.request.user


class AddressViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing user addresses
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer
    
    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # If this is marked as default, unset any existing default
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        # If this is marked as default, unset any existing default
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user, is_default=True).exclude(
                pk=serializer.instance.pk).update(is_default=False)
        serializer.save()
    
    @extend_schema(
        summary="List user addresses",
        description="Returns a list of addresses for the current user",
        responses={
            200: OpenApiResponse(response=AddressSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required")
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create new address",
        description="Add a new address to the user's profile",
        request=AddressSerializer,
        responses={
            201: OpenApiResponse(response=AddressSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required")
        }
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get address details",
        description="Get detailed information about an address",
        responses={
            200: OpenApiResponse(response=AddressSerializer),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Address not found")
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update address",
        description="Update address information",
        request=AddressSerializer,
        responses={
            200: OpenApiResponse(response=AddressSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Address not found")
        }
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @extend_schema(
        summary="Delete address",
        description="Delete an address from user's profile",
        responses={
            204: OpenApiResponse(description="Address deleted successfully"),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Address not found")
        }
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    @extend_schema(
        summary="Set address as default",
        description="Set an address as the user's default address",
        responses={
            200: OpenApiResponse(response=AddressSerializer),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Address not found")
        }
    )
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        address = self.get_object()
        
        # Unset any existing default
        Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
        
        # Set this address as default
        address.is_default = True
        address.save()
        
        serializer = self.get_serializer(address)
        return Response(serializer.data)

class UserLanguageAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get user's preferred language",
        responses={200: UserLanguageSerializer},
        examples=[
            OpenApiExample(
                "Get Preferred Language",
                value={"preferred_language": "ja"},
                response_only=True
            )
        ]
    )
    def get(self, request):
        serializer = UserLanguageSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Update user's preferred language",
        request=UserLanguageSerializer,
        responses={200: UserLanguageSerializer},
        examples=[
            OpenApiExample(
                "Update Preferred Language",
                value={"preferred_language": "en"},
                request_only=True
            )
        ]
    )
    def put(self, request):
        serializer = UserLanguageSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(generics.GenericAPIView):
    """
    API view for changing user password
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer
    
    @extend_schema(
        operation_id="change_password",
        summary="Change user password",
        description="Change the current user's password by providing current password and new password",
        request=PasswordChangeSerializer,
        responses={
            200: OpenApiResponse(
                description="Password changed successfully",
                response={
                    "type": "object",
                    "properties": {
                        "message": {"type": "string", "description": "Success message"}
                    }
                }
            ),
            400: OpenApiResponse(
                description="Bad request, validation error"
            ),
            401: OpenApiResponse(
                description="Authentication required"
            )
        },
        examples=[
            OpenApiExample(
                "Password Change Example",
                summary="Sample password change request",
                value={
                    "current_password": "currentPassword123",
                    "new_password": "newPassword456"
                },
                request_only=True
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(
                    {"message": _("Your password has been successfully updated!")},
                    status=status.HTTP_200_OK
                )
            except Exception:
                return Response(
                    {"detail": _("Couldn’t update your password. Please try again.")},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)