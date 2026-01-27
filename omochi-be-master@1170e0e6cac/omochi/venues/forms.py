from django import forms

from .models import Venue, VenueQuestion
from omochi.common.multilingual_service import TranslationButtonMixin


class VenueAdminForm(TranslationButtonMixin, forms.ModelForm):
    """
    Custom form for Venue admin with OpenAI translation buttons
    """
    
    # Define fields with strip=False to preserve whitespace
    description = forms.CharField(
        strip=False,
        required=False,
        widget=forms.Textarea(attrs={
            'rows': 10,
            'cols': 75,
            'placeholder': 'Enter venue description...'
        }),
        help_text='Description of the venue in Japanese'
    )
    
    description_en = forms.CharField(
        strip=False,
        required=False,
        widget=forms.Textarea(attrs={
            'rows': 10,
            'cols': 75,
            'placeholder': 'Enter venue description in English...'
        }),
    )
    
    announcement = forms.CharField(
        strip=False,
        required=False,
        widget=forms.Textarea(attrs={
            'rows': 10,
            'cols': 75,
            'placeholder': 'Enter venue announcement...'
        }),
        help_text='Special announcements for the venue in Japanese'
    )
    
    announcement_en = forms.CharField(
        strip=False,
        required=False,
        widget=forms.Textarea(attrs={
            'rows': 10,
            'cols': 75,
            'placeholder': 'Enter venue announcement in English...'
        }),
    )
    
    class Meta:
        model = Venue
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add translate buttons for each field that has English translation
        self.add_translation_buttons(['name', 'address', 'description', 'announcement'])


class VenueQuestionAdminForm(TranslationButtonMixin, forms.ModelForm):
    """
    Custom form for VenueQuestion admin with OpenAI translation buttons
    """
    class Meta:
        model = VenueQuestion
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add translate buttons for each field that has English translation
        self.add_translation_buttons(['question'])
