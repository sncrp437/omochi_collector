from django import forms

from omochi.common.multilingual_service import TranslationButtonMixin
from .models import MenuItem


class MenuItemAdminForm(TranslationButtonMixin, forms.ModelForm):
    """
    Custom form for MenuItem admin with OpenAI translation buttons
    """
    class Meta:
        model = MenuItem
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add translate buttons for each field that has English translation
        self.add_translation_buttons(['name', 'description'])