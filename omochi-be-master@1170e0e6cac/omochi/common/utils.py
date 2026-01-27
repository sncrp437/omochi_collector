"""
Common utility functions for the OMOCHI application
"""
import logging
import os
import random
import string
from typing import Optional
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import HttpRequest
from django.db import models
from django.core.exceptions import ValidationError
import datetime
import pytz
from django.utils.timezone import now


logger = logging.getLogger(__name__)


# Venue field length constants
VENUE_TEXT_FIELD_MAX_LENGTH = 500


def validate_image_format(value):
    """Validate that uploaded image is PNG or JPEG by checking extension and basic file headers"""
    if value:
        # Check file extension
        if not value.name.lower().endswith(('.png', '.jpg', '.jpeg')):
            raise ValidationError('Only PNG, JPG, and JPEG image formats are allowed.')
        
        # Check file size (basic security check)
        if value.size > 10 * 1024 * 1024:  # 10MB limit
            raise ValidationError('Image file size must be less than 10MB.')
        
        # Check basic file headers for security
        try:
            # Reset file pointer to beginning
            value.seek(0)
            
            # Read first few bytes to check magic numbers
            header = value.read(8)
            value.seek(0)  # Reset file pointer
            
            # Check PNG magic number
            if value.name.lower().endswith('.png'):
                if not header.startswith(b'\x89PNG\r\n\x1a\n'):
                    raise ValidationError('Invalid PNG file format.')
            
            # Check JPEG magic number  
            elif value.name.lower().endswith(('.jpg', '.jpeg')):
                if not (header.startswith(b'\xff\xd8\xff') or header.startswith(b'\xff\xd8')):
                    raise ValidationError('Invalid JPEG file format.')
                    
        except Exception as e:
            # If header check fails, still allow upload but log the issue
            pass


def build_absolute_url(file_field, request: Optional[HttpRequest] = None) -> Optional[str]:
    """
    Build an absolute URL for a file field (ImageField/FileField).
    
    This function handles various scenarios:
    - S3 storage (returns full S3 URLs)
    - Local development with media files
    - Request-based URL building when available
    
    Args:
        file_field: Django FileField/ImageField instance
        request: Optional HttpRequest object for building absolute URLs
        
    Returns:
        str: Absolute URL or None if file doesn't exist
    """
    if not file_field:
        return None
    
    try:
        # Get the URL from the file field
        file_url = file_field.url
        
        # Check if it's already an absolute URL (common with S3 storage)
        if file_url.startswith(('http://', 'https://')):
            return file_url
        
        # If we have a request object, use it to build absolute URL
        if request:
            return request.build_absolute_uri(file_url)
        
        # Fall back to using MEDIA_URL setting
        media_url = getattr(settings, 'MEDIA_URL', '')
        if media_url and media_url.startswith(('http://', 'https://')):
            # MEDIA_URL is already absolute (like S3 URLs)
            # Django's FileField.url for local storage typically returns something like '/media/path/file.jpg'
            # We need to replace the relative media URL prefix with the absolute one
            return media_url.rstrip('/') + file_url
        
        # For local development, try to build with site domain
        site_url = getattr(settings, 'SITE_URL', None)
        if site_url:
            return _join_urls(site_url, file_url)
        
        # Last resort: return the relative URL
        return file_url
        
    except Exception as e:
        logger.warning(f"Error building absolute URL for file field: {str(e)}")
        return None


def build_absolute_image_url(image_field, request: Optional[HttpRequest] = None) -> Optional[str]:
    """
    Convenience function specifically for ImageField instances.
    Alias for build_absolute_url but with a more descriptive name for images.
    
    Args:
        image_field: Django ImageField instance
        request: Optional HttpRequest object
        
    Returns:
        str: Absolute image URL or None if image doesn't exist
    """
    return build_absolute_url(image_field, request)


def _join_urls(base_url: str, path: str) -> str:
    """
    Properly join a base URL with a path, handling slashes correctly.
    
    Args:
        base_url: Base URL (may or may not end with /)
        path: Path to append (may or may not start with /)
        
    Returns:
        str: Properly joined URL
    """
    base_url = base_url.rstrip('/')
    path = path.lstrip('/')
    return f"{base_url}/{path}"


def get_media_url_for_storage():
    """
    Get the appropriate media URL based on the current storage backend.
    Useful for determining if we're using S3, local storage, etc.
    
    Returns:
        str: Media URL from settings
    """
    return getattr(settings, 'MEDIA_URL', '/media/')


def is_s3_storage() -> bool:
    """
    Check if the default file storage is using S3.
    
    Returns:
        bool: True if using S3 storage
    """
    storage_class = default_storage.__class__.__name__
    return 'S3' in storage_class or 's3' in storage_class.lower()


class AbsoluteURLMixin(models.Model):
    """
    Mixin to add absolute URL methods to models with file/image fields.
    
    Usage:
    class Venue(AbsoluteURLMixin, models.Model):
        logo = models.ImageField(upload_to='venue_logos/')
        
    # Then you can use:
    venue.get_absolute_url('logo')
    venue.get_absolute_image_url('logo')
    """
    
    class Meta:
        abstract = True
    
    def get_absolute_url(self, field_name: str, request: Optional[HttpRequest] = None) -> Optional[str]:
        """
        Get absolute URL for a file field.
        
        Args:
            field_name: Name of the file field
            request: Optional HttpRequest object
            
        Returns:
            str: Absolute URL or None
        """
        try:
            file_field = getattr(self, field_name, None)
            return build_absolute_url(file_field, request)
        except AttributeError:
            logger.warning(f"Field '{field_name}' not found on {self.__class__.__name__}")
            return None
    
    def get_absolute_image_url(self, field_name: str, request: Optional[HttpRequest] = None) -> Optional[str]:
        """
        Get absolute URL for an image field.
        
        Args:
            field_name: Name of the image field
            request: Optional HttpRequest object
            
        Returns:
            str: Absolute URL or None
        """
        return self.get_absolute_url(field_name, request)


def get_day_utc_range(timezone_str='Asia/Tokyo', date=None):
    """
    Get the start and end UTC datetime objects for a specific day in a given timezone.
    
    Args:
        timezone_str: Timezone string (default: 'Asia/Tokyo')
        date: Date object to use. If None, today's date in the specified timezone will be used.
        
    Returns:
        tuple: (start_of_day_utc, end_of_day_utc) - UTC datetime objects 
               representing the start and end of the day in the specified timezone
    """
    # Get timezone object
    target_timezone = pytz.timezone(timezone_str)
    
    # Get the date in the target timezone if not provided
    if date is None:
        date = now().astimezone(target_timezone).date()
    
    # Create start and end datetime objects in target timezone
    start_of_day = target_timezone.localize(
        datetime.datetime.combine(date, datetime.time.min)
    )
    end_of_day = target_timezone.localize(
        datetime.datetime.combine(date, datetime.time.max)
    )
    
    # Convert to UTC for database queries
    start_of_day_utc = start_of_day.astimezone(pytz.UTC)
    end_of_day_utc = end_of_day.astimezone(pytz.UTC)
    
    return start_of_day_utc, end_of_day_utc


def get_timezone_date(timezone_str='Asia/Tokyo'):
    """
    Get the current date in a specified timezone.
    
    Args:
        timezone_str: Timezone string (default: 'Asia/Tokyo')
        
    Returns:
        date: Current date in the specified timezone
    """
    target_timezone = pytz.timezone(timezone_str)
    return now().astimezone(target_timezone).date()

def get_timezone_datetime(timezone_str='Asia/Tokyo'):
    """
    Get the current date in a specified timezone.
    
    Args:
        timezone_str: Timezone string (default: 'Asia/Tokyo')
        
    Returns:
        date: Current date in the specified timezone
    """
    target_timezone = pytz.timezone(timezone_str)
    return now().astimezone(target_timezone)


def get_unique_key(length=8):
    """
    Generate a unique key with random characters and numbers.
    
    Args:
        length: Length of the unique key (default: 8)
        
    Returns:
        str: Random string containing letters and numbers
    """
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


def generate_unique_filename(original_filename, unique_key=None):
    """
    Generate a unique filename by adding a unique key before the file extension.
    
    Args:
        original_filename: Original filename (e.g., 'image.jpg')
        unique_key: Optional unique key. If None, a new one will be generated.
        
    Returns:
        str: Unique filename (e.g., 'image_AbC12DeF.jpg')
    """
    if not original_filename:
        return None
    
    # Generate unique key if not provided
    if unique_key is None:
        unique_key = get_unique_key()
    
    # Split filename and extension
    name, ext = os.path.splitext(original_filename)
    
    # Create unique filename: original_name_uniquekey.extension
    unique_filename = f"{name}_{unique_key}{ext}"
    
    return unique_filename


def create_unique_upload_filename(original_filename):
    """
    Create a unique filename for upload by adding a random 8-character key.
    
    Args:
        original_filename: Original filename (e.g., 'image.jpg')
        
    Returns:
        str: Unique filename (e.g., 'image_AbC12DeF.jpg')
    """
    return generate_unique_filename(original_filename)


class UniqueFileUploadMixin:
    """
    Mixin to automatically add unique keys to file uploads.
    Just inherit this mixin in your model and all ImageField/FileField will get unique names.
    
    Usage:
    class Venue(UniqueFileUploadMixin, models.Model):
        logo = models.ImageField(upload_to='venue_logos/')
    """
    
    def save(self, *args, **kwargs):
        # Process file fields before saving
        for field in self._meta.get_fields():
            if hasattr(field, 'upload_to') and hasattr(self, field.name):
                file_field = getattr(self, field.name)
                
                # Check if it's a new file being uploaded
                if file_field and hasattr(file_field, 'file') and file_field.file:
                    # Only process if it's a new upload (not already saved)
                    if not file_field.name or file_field._committed is False:
                        original_name = file_field.name or getattr(file_field.file, 'name', 'unnamed')
                        
                        # Extract just the filename
                        import os
                        if '/' in original_name:
                            dir_part, filename = os.path.split(original_name)
                        else:
                            filename = original_name
                            
                        # Generate unique filename
                        unique_filename = create_unique_upload_filename(filename)
                        
                        # Update the file name
                        file_field.name = unique_filename
        
        # Call the original save method
        super().save(*args, **kwargs)


class CompleteImageHandlingMixin(UniqueFileUploadMixin, AbsoluteURLMixin):
    """
    Combined mixin that provides both unique file uploads and absolute URL handling.
    This mixin inherits from both UniqueFileUploadMixin and AbsoluteURLMixin to provide
    a complete solution for file upload handling in Django models.
    
    Usage:
    class Venue(CompleteImageHandlingMixin, models.Model):
        logo = models.ImageField(upload_to='venue_logos/')
        
    # This provides:
    # 1. Automatic unique filenames when uploading (from UniqueFileUploadMixin)
    # 2. Methods to get absolute URLs that work in both local and production environments:
    venue.get_absolute_url('logo')
    venue.get_absolute_image_url('logo')
    """
    
    class Meta:
        abstract = True


def create_length_validator(max_length, field_name="Field", normalize_line_endings=True):
    """
    Create a dynamic validation function for field length checking.
    This is the unified validator that handles all text field validation needs.
    
    Args:
        max_length (int): Maximum allowed length
        field_name (str): Name of the field for error messages
        normalize_line_endings (bool): Whether to normalize line endings (\r\n -> \n)
    
    Returns:
        function: Validation function that can be used in model field validators
    """
    def validate_field_length(value):
        if not value:  # Allow empty/null values
            return
        
        # Normalize line endings if requested (for text fields that support multiline)
        if normalize_line_endings:
            normalized_value = value.replace('\r\n', '\n').replace('\r', '\n')
        else:
            normalized_value = value
            
        if len(normalized_value) > max_length:
            raise ValidationError(
                f'{field_name} must be {max_length} characters or less '
                f'(currently {len(normalized_value)} characters)'
            )
    
    return validate_field_length


def validate_venue_text_field_length(value, field_name="Text field"):
    """Validate text field length after normalizing line endings (legacy wrapper)"""
    validator = create_length_validator(VENUE_TEXT_FIELD_MAX_LENGTH, field_name, normalize_line_endings=True)
    return validator(value)


def validate_description_length(value):
    """Validate description length"""
    validator = create_length_validator(VENUE_TEXT_FIELD_MAX_LENGTH, "Description", normalize_line_endings=True)
    return validator(value)


def validate_announcement_length(value):
    """Validate announcement length"""
    validator = create_length_validator(VENUE_TEXT_FIELD_MAX_LENGTH, "Announcement", normalize_line_endings=True)
    return validator(value)


def validate_question_length(value):
    """Validate question length (max 255 characters, no line ending normalization)"""
    validator = create_length_validator(255, "Question", normalize_line_endings=False)
    return validator(value)


def validate_answer_length(value):
    """Validate answer length (max 50 characters)"""
    validator = create_length_validator(50, "Answer", normalize_line_endings=True)
    return validator(value)
