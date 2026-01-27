import uuid
import string
import random
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import logging
from omochi.notifications.fcm_topic_service import fcm_topic_service


logger = logging.getLogger(__name__)


class UserManager(BaseUserManager):
    def generate_ref_code(self):
        """Generate a unique 8-character referral code"""
        while True:
            # Generate random 8-character code using letters and numbers
            ref_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            # Check if this code already exists
            if not self.filter(ref_code=ref_code).exists():
                return ref_code
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        
        # Generate unique ref_code if not provided
        if 'ref_code' not in extra_fields:
            extra_fields['ref_code'] = self.generate_ref_code()
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=False)
    last_name = models.CharField(max_length=100, blank=True)
    ref_code = models.CharField(max_length=12, unique=True, blank=True, null=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='ja', choices=[('ja', 'Japanese'), ('en', 'English')])
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    class Meta:
        db_table = 'user'
    
    def __str__(self):
        return self.email
        
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email
        
    def get_short_name(self):
        return self.first_name or self.email
        
    def save(self, *args, **kwargs):
        # Normalize email to lowercase before saving
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)
    
    def get_active_fcm_tokens(self):
        """Get all active FCM tokens for this user"""
        return self.fcm_tokens.filter(is_active=True).values_list('token', flat=True)
    
    def register_fcm_token(self, token, device_type='WEB', device_id=None):
        """Register a new FCM token for this user"""
        from .models import FCMToken  # Avoid circular import
        return FCMToken.register_token(self, token, device_type, device_id)
    
    def unsubscribe_from_all_users_topic(self):
        """
        Unsubscribe all active FCM tokens from all broadcast notification topics.
        Delegates to FCMTopicService for centralized logic.
        """
        return fcm_topic_service.unsubscribe_user_tokens(self)


class Address(models.Model):
    """
    Address model for storing user address information.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    is_default = models.BooleanField(default=True)
    prefecture = models.CharField(max_length=50)
    city = models.CharField(max_length=100)
    detail = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'address'
        verbose_name_plural = 'addresses'
        unique_together = ('user', 'prefecture', 'city', 'detail')
        
    def __str__(self):
        return f"{self.prefecture} {self.city} {self.detail}"


class FCMToken(models.Model):
    """
    Model to manage Firebase Cloud Messaging tokens for push notifications.
    Allows multiple devices per user with individual token management.
    """
    DEVICE_TYPE_CHOICES = (
        ('WEB', 'Web Browser'),
        ('ANDROID', 'Android'),
        ('IOS', 'iOS'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fcm_tokens')
    token = models.TextField(unique=True, help_text="Firebase Cloud Messaging token")
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES, default='WEB')
    device_id = models.CharField(max_length=255, blank=True, null=True, help_text="Unique device identifier")
    is_active = models.BooleanField(default=True, help_text="Whether this token is active and valid")
    last_used = models.DateTimeField(auto_now=True, help_text="Last time this token was used for notifications")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fcm_token'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.device_type} - {self.token[:20]}..."
    
    @classmethod
    def get_active_tokens_for_user(cls, user):
        """Get all active FCM tokens for a user"""
        return cls.objects.filter(user=user, is_active=True).values_list('token', flat=True)
    
    @classmethod
    def register_token(cls, user, token, device_type='WEB', device_id=None):
        """
        Register or update an FCM token for a user.
        Non-venue-manager users are automatically subscribed to language-specific broadcast topic.
        """
        fcm_token, created = cls.objects.get_or_create(
            token = token,
            defaults={
                'user': user,
                'device_id': device_id or f"{device_type}_{token[:10]}",
                'device_type': device_type,
                'is_active': True,
            }
        )
        
        if not created:
            # Update token if it changed
            fcm_token.device_type = device_type
            fcm_token.user = user
            fcm_token.device_id = device_id or f"{device_type}_{token[:10]}"
            fcm_token.token = token
            fcm_token.is_active = True
            fcm_token.save()
        
        # Subscribe to language-specific broadcast topic if user is not a venue manager
        if not user.managed_venues.exists():
            from omochi.notifications.fcm_topic_service import fcm_topic_service
            # For new tokens, no need to unsubscribe from other topic
            fcm_topic_service.subscribe_user_tokens(user, unsubscribe_from_other=not created)
        
        return fcm_token
    
    @classmethod
    def deactivate_token(cls, token):
        """Deactivate an FCM token (when it becomes invalid)"""
        cls.objects.filter(token=token).update(is_active=False)
    
    def mark_as_used(self):
        """Update the last_used timestamp"""
        self.last_used = timezone.now()
        self.save(update_fields=['last_used'])

class PasswordResetToken(models.Model):
    """
    Model to store password reset tokens for users.
    """
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=128, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    ip = models.CharField(max_length=45, blank=True, null=True, help_text="Requester IP for rate limiting")

    class Meta:
        db_table = 'password_reset_token'
        indexes = [
            models.Index(fields=['user', 'token', 'used']),
            models.Index(fields=['ip', 'created_at']),  # For rate limiting by IP
        ]

    def is_valid(self):
        from django.utils import timezone
        return not self.used and self.expires_at > timezone.now()

    def mark_used(self):
        self.used = True
        self.save(update_fields=['used'])
