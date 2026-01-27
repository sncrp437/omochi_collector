"""
OpenAI Service Module for Translation and Content Processing
"""
import logging
from typing import Dict, Optional, Union
from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


class OpenAIService:
    """Service class for handling OpenAI API interactions"""
    
    def __init__(self):
        """Initialize OpenAI client with configuration from settings"""
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        
        if not api_key:
            logger.error("OPENAI_API_KEY is not configured in settings")
            raise ValueError("OPENAI_API_KEY is not configured in settings")
        
        self.client = OpenAI(api_key=api_key)
        self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
        self.temperature = getattr(settings, 'OPENAI_TEMPERATURE', 1)
        self.max_tokens = getattr(settings, 'OPENAI_MAX_TOKENS', 5000)
        
    def translate_text(
        self, 
        text: str, 
        target_language: str = "English",
        source_language: str = "Japanese", 
        field_type: str = "general",
        context: Optional[str] = None
    ) -> Dict[str, Union[str, bool]]:
        """
        Translate text using OpenAI API
        
        Args:
            text: Text to translate
            target_language: Target language (default: 'English')
            source_language: Source language (default: 'Japanese')
            field_type: Type of field being translated (name, address, description, announcement)
            context: Additional context for better translation
            
        Returns:
            Dict with 'success', 'translated_text', and optional 'error' keys
        """
        try:
            # Use the new specialized prompt
            system_prompt = f"""You are a professional translator specializing in online ordering platforms. 
                Translate the following text from {source_language} to {target_language} **accurately and naturally**, keeping it concise and preserving the original meaning. 
                Field type: {field_type}
                Text: "{text}"
                - Do not add or invent any information.
                - Keep it suitable for display in a digital ordering interface.
                - Output only the translated text without extra explanation or formatting.
                - If the text is already in {target_language}, return it unchanged.
                - Preserve the original text structure (line breaks, numbering, bullet points, indentation)."""

            # Make the API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            translated_text = response.choices[0].message.content.strip()
            
            return {
                'success': True,
                'translated_text': translated_text,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"OpenAI Translation error message: {str(e)}")
            
            # Check if it's an API key related error
            error_str = str(e).lower()
            if 'api' in error_str and ('key' in error_str or 'auth' in error_str):
                logger.error("This appears to be an API key authentication issue!")
            
            return {
                'success': False,
                'error': str(e),
                'translated_text': text  # Return original text as fallback
            }

# Singleton instance for reuse
_openai_service = None

def get_openai_service() -> OpenAIService:
    """Get singleton instance of OpenAIService"""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service