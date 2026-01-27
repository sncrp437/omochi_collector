from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from django.contrib.auth import get_user_model
from omochi.users.models import Address
from django.utils.translation import gettext_lazy as _  # Import translation function
import re
from drf_spectacular.utils import extend_schema_field

User = get_user_model()


class UserValidationMixin:
    """Mixin class with common user field validations"""
    
    def validate_first_name(self, value):
        """
        Validate first name maximum length
        """
        if len(value) > 100:
            raise serializers.ValidationError(_("First name must not exceed 100 characters."))
        return value
    
    def validate_last_name(self, value):
        """
        Validate last name maximum length
        """
        if value and len(value) > 100:
            raise serializers.ValidationError(_("Last name must not exceed 100 characters."))
        return value
    
    def validate_phone_number(self, value):
        """
        Validate that phone number is 10-11 digits.
        """
        if not re.match(r'^\d{10,11}$', value):
            raise serializers.ValidationError(_("Phone number must be 10-11 digits."))
        return value
    
    def validate_ref_code(self, value):
        """
        Validate the referral code if provided
        """
        if not value:
            return value
            
        # Check if ref_code exists
        if not User.objects.filter(ref_code=value).exists():
            raise serializers.ValidationError(_("Invalid referral code."))
            
        return value


class AddressSerializer(serializers.ModelSerializer):
    """Serializer for address data"""
    
    class Meta:
        model = Address
        fields = ('id', 'prefecture', 'city', 'detail', 'is_default')
        read_only_fields = ('id',)


class VenueRoleSerializer(serializers.Serializer):
    """Serializer for user's venue management roles"""
    venue_id = serializers.CharField()
    venue_name = serializers.CharField()
    role = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data"""
    venue_roles = serializers.SerializerMethodField()
    addresses = AddressSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'ref_code', 'date_joined',
                  'last_login', 'avatar', 'venue_roles', 'addresses')
        read_only_fields = ('id', 'ref_code', 'date_joined', 'last_login')
    
    @extend_schema_field({
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'venue_id': {'type': 'string'},
                'venue_name': {'type': 'string'},
                'role': {'type': 'string'}
            }
        }
    })
    def get_venue_roles(self, obj):
        """Get the roles that the user has in various venues"""
        venue_managers = obj.managed_venues.all()
        result = []
        for user in venue_managers:
            result.append({
                'venue_id': str(user.venue.id),
                'venue_name': user.venue.name,
                'role': user.role
            })
        return result


class UserProfileUpdateSerializer(UserValidationMixin, serializers.ModelSerializer):
    """Serializer for updating user profile with limited fields"""
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'avatar', 'phone_number')


class AddressRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for creating address during registration"""
    
    city = serializers.CharField(max_length=100)
    detail = serializers.CharField(max_length=255)
    
    class Meta:
        model = Address
        fields = ('prefecture', 'city', 'detail')
        
    def validate_city(self, value):
        if len(value) > 100:
            raise serializers.ValidationError(_("City name must not exceed 100 characters."))
        return value
        
    def validate_detail(self, value):
        if len(value) > 255:
            raise serializers.ValidationError(_("Address detail must not exceed 255 characters."))
        return value


class UserRegistrationSerializer(UserValidationMixin, serializers.ModelSerializer):
    """Serializer for creating new users"""
    
    email = serializers.EmailField(max_length=100)
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, max_length=12)
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, max_length=12)
    address = AddressRegistrationSerializer(write_only=True, required=True)
    ref_code = serializers.CharField(max_length=12, required=False, allow_blank=True, write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'phone_number', 'first_name', 'last_name', 'password',
                  'password_confirm', 'avatar', 'address', 'ref_code')
        read_only_fields = ('id',)
        extra_kwargs = {
            'phone_number': {'required': True}
        }
    
    def validate_email(self, value):
        """
        Validate email maximum length and uniqueness
        """
        # Convert to lowercase for case-insensitive uniqueness check
        value = value.lower() 
        
        if len(value) > 100:
            raise serializers.ValidationError(_("Email must not exceed 100 characters."))
            
        # Check if email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
            
        return value
    
    def validate_password(self, value):
        """
        Validate password requirements
        """
        if len(value) < 6:
            raise serializers.ValidationError(_("Password must be at least 6 characters long."))
        if len(value) > 12:
            raise serializers.ValidationError(_("Password must not exceed 12 characters."))
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password_confirm": _("Password fields didn't match.")})
        return attrs
    
    def create(self, validated_data):
        address_data = validated_data.pop('address')
        ref_code = validated_data.pop('ref_code', None)
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            avatar=validated_data.get('avatar', None)
        )
        
        # Create the address for the user
        Address.objects.create(
            user=user,
            prefecture=address_data['prefecture'],
            city=address_data['city'],
            detail=address_data['detail'],
            is_default=True
        )
        
        # Handle referral code logic
        if ref_code:
            # Import here to avoid circular imports
            from omochi.ref_logs.services import RefLogService
            
            # Log the referral registration
            RefLogService.log_registration(user, ref_code, str(user.id))
        
        return user
    
    def to_representation(self, instance):
        """
        Override to include the user's address in the response after creation
        """
        user_representation = UserSerializer(instance, context=self.context).data
        return user_representation


class LoginResponseSerializer(serializers.Serializer):
    """Serializer for the login response that includes tokens and user data"""
    access = serializers.CharField(help_text="JWT access token for API authorization")
    refresh = serializers.CharField(help_text="JWT refresh token to obtain new access tokens")
    user = UserSerializer(help_text="User profile information")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that includes user details"""
    
    def validate(self, attrs):
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()
        
        data = super().validate(attrs)
        user_serializer = UserSerializer(self.user)
        data.update({'user': user_serializer.data})
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting a password reset"""
    
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a password reset"""
    token = serializers.CharField()
    new_password = serializers.CharField(style={'input_type': 'password'})

    def validate_new_password(self, value):
        """
        Validate new password requirements
        """
        if len(value) < 6:
            raise serializers.ValidationError(_("Password must be at least 6 characters long."))
        if len(value) > 12:
            raise serializers.ValidationError(_("Password must not exceed 12 characters."))
        return value


class UserLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['preferred_language']


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing user password"""
    
    current_password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'},
        help_text="User's current password"
    )
    new_password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'},
        max_length=12,
        help_text="New password (6-12 characters)"
    )
    
    def validate_new_password(self, value):
        """
        Validate new password requirements
        """
        if len(value) < 6:
            raise serializers.ValidationError(_("Password must be at least 6 characters long."))
        if len(value) > 12:
            raise serializers.ValidationError(_("Password must not exceed 12 characters."))
        return value
    
    def validate_current_password(self, value):
        """
        Validate that the current password is correct
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(_("The password you entered doesn’t match. Please try again."))
        return value
    
    def validate(self, attrs):
        """
        Validate that new password is different from current password
        """
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                "new_password": _("New password cannot be the same as current password.")
            })
        return attrs
    
    def save(self, **kwargs):
        """
        Update the user's password
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user