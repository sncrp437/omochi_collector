"""
Multilingual service for handling language detection and field mapping across all apps
"""

from enum import Enum

# Common enum for multilingual param
MULTILINGUAL_ENUM = ['true', 'false']
from django.utils import translation
from django.utils.translation import get_language_from_request
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from typing import Dict, Any


class SupportedLanguage(str, Enum):
    """Supported languages enum"""
    JAPANESE = 'ja'
    ENGLISH = 'en'


class MultilingualService:
    """Service to handle multilingual field mapping for multiple models"""
    
    @classmethod
    def get_multilingual_fields(cls, obj: Any) -> Dict[str, str]:
        """
        Get multilingual fields mapping for a specific model instance
        Returns mapping of base_field -> english_field
        """
        model_name = obj.__class__.__name__
        
        # Base fields that are common across models
        common_fields = {'name': 'name_en', 'description': 'description_en'}
        
        # Model-specific fields
        model_specific = {
            'Venue': {
                'address': 'address_en',
                'announcement': 'announcement_en',
                'genre': 'genre_en',
                'additional_info': 'additional_info_en',
                'nearest_station': 'nearest_station_en',
            },
            'MenuItem': {
                # MenuItem just uses common fields
            },
            'MenuCategory': {
                # MenuCategory just uses common fields
            },
            'Area': {
                'prefecture': 'prefecture_en',
                'station': 'station_en',
            },
            'Notification': {
                'title': 'title_en',
                'message': 'message_en',
            },
            'VenueQuestion': {
                'question': 'question_en',
            },
            'OrderQuestion': {
                'question': 'question_en',
                'answer': 'answer_en',
            },
            'ReservationQuestion': {
                'question': 'question_en',
                'answer': 'answer_en',
            },
        }
        
        # Combine common + model-specific fields
        all_fields = {**common_fields}
        if model_name in model_specific:
            all_fields.update(model_specific[model_name])
        
        # Only return fields that actually exist on the object
        existing_fields = {}
        for base_field, en_field in all_fields.items():
            if hasattr(obj, base_field) and hasattr(obj, en_field):
                existing_fields[base_field] = en_field
        
        return existing_fields
    
    @classmethod
    def get_current_language(cls, request=None) -> SupportedLanguage:
        """
        Get current language from request or thread local
        Returns SupportedLanguage.JAPANESE (default) or SupportedLanguage.ENGLISH
        """
        if request:
            # Get language from Accept-Language header
            language = get_language_from_request(request)
        else:
            # Get from thread local (set by LocaleMiddleware)
            language = translation.get_language()
        
        # Normalize to our supported languages
        if language:
            language_lower = language.lower()
            if language_lower.startswith('en'):
                return SupportedLanguage.ENGLISH
            elif language_lower.startswith('ja'):
                return SupportedLanguage.JAPANESE
        
        # Default to Japanese for any other language or None
        return SupportedLanguage.JAPANESE
    
    @classmethod
    def get_localized_fields(cls, obj: Any, language: SupportedLanguage = None, request=None) -> Dict[str, Any]:
        """
        Get localized field values for an object
        
        Args:
            obj: Model instance
            language: Target language (SupportedLanguage). If None, detect from request
            request: Django request object for language detection
            
        Returns:
            Dict with localized field values
        """
        if language is None:
            language = cls.get_current_language(request)
        
        localized_data = {}
        
        # Get dynamic field mapping for this specific object
        multilingual_fields = cls.get_multilingual_fields(obj)
        
        for base_field, en_field in multilingual_fields.items():
            # Get Japanese (default) value
            ja_value = getattr(obj, base_field, '') or ''
            
            if language == SupportedLanguage.ENGLISH:
                # Try to get English value
                en_value = getattr(obj, en_field, '') or ''
                # Use English if available, otherwise fallback to Japanese
                localized_data[base_field] = en_value if en_value else ja_value
            else:
                # Use Japanese (default) version
                localized_data[base_field] = ja_value
        
        return localized_data
    
    @classmethod
    def apply_localization_to_data(cls, data: Dict[str, Any], obj: Any, language: SupportedLanguage = None, request=None) -> Dict[str, Any]:
        """
        Apply localization to serializer data
        
        Args:
            data: Serialized data dict
            obj: Original model instance  
            language: Target language (SupportedLanguage). If None, detect from request
            request: Django request object for language detection
            
        Returns:
            Data dict with localized field values
        """
        if language is None:
            language = cls.get_current_language(request)
        
        localized_fields = cls.get_localized_fields(obj, language, request)
        
        # Update data with localized values
        for field, value in localized_fields.items():
            if field in data:
                data[field] = value
        
        return data


class MultilingualSerializerMixin:
    """
    Mixin class to provide multilingual functionality to serializers.
    Eliminates code duplication between different multilingual serializers.
    """
    
    def to_representation(self, instance):
        """
        Apply multilingual functionality to serializer representation.
        """
        # Get the base representation
        data = super().to_representation(instance)
        
        # Get the request from the serializer context
        request = self.context.get('request')
        
        if not request:
            return data
        
        # Check if multilingual is disabled via query param
        # Default is True (enable multilingual) unless explicitly set to 'false'
        enable_multilingual = request.GET.get('multilingual', 'true').lower() != 'false'
        
        if enable_multilingual:
            # Apply localization based on Accept-Language header
            # multilingual=true + Accept-Language: ja → return Japanese (original)
            # multilingual=true + Accept-Language: en → return English (translated)
            return MultilingualService.apply_localization_to_data(
                data=data,
                obj=instance,
                request=request
            )
        # else:
        #     multilingual=false → always return Japanese (original)
        #     Do not call MultilingualService, return original data
        
        return data


class TranslationButtonMixin:
    """
    Mixin to add translation buttons to form fields with English translations.
    Reusable across different admin forms that need multilingual translation functionality.
    """
    def add_translation_buttons(self, translate_fields):
        """
        Add translation buttons to specified fields that have English translations.
        
        Args:
            translate_fields: List of field names to add translation buttons for
        """
        for field_name in translate_fields:
            field_en = f"{field_name}_en"
            if field_en in self.fields:
                # Add help text with translate button
                current_help_text = self.fields[field_en].help_text or ""
                translate_button = format_html(
                    '<button type="button" class="translate-btn" '
                    'data-source="{}" data-target="{}" '
                    'style="padding: 5px 10px; margin-top: 10px; '
                    'background-color: #007cba; color: white; border: none; '
                    'border-radius: 3px; cursor: pointer; font-size: 12px;">'
                    '🔄 Translate to English</button>',
                    field_name, field_en
                )
                self.fields[field_en].help_text = mark_safe(
                    f"{current_help_text} {translate_button}"
                )