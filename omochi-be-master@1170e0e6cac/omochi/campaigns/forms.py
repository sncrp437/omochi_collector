from django import forms
from .models import Campaign
from .widgets import CharCountTextarea, CharCountTextInput
from omochi.common.utils import get_timezone_date


class CampaignAdminForm(forms.ModelForm):
    # Explicitly define fields to prevent Django from stripping whitespace  
    title = forms.CharField(
        strip=True,
        widget=CharCountTextInput(max_length=50, strip_for_count=True)
    )
    description = forms.CharField(
        strip=False,
        widget=CharCountTextarea(),  # Don't limit description length
        required=True
    )
    
    class Meta:
        model = Campaign
        fields = '__all__'
    
    def clean_title(self):
        title = self.cleaned_data.get('title', '')
        if title:
            # Check if title is not just whitespace after stripping
            stripped_title = title.strip()
            if not stripped_title:
                raise forms.ValidationError(
                    'Title cannot be empty or contain only spaces.'
                )
            return title
        return title

    def clean_start_date(self):
        """Validate that start_date is not in the past"""
        start_date = self.cleaned_data.get('start_date')
        if start_date:
            current_date = get_timezone_date('Asia/Tokyo')
            if start_date < current_date:
                raise forms.ValidationError(
                    'Campaign start date cannot be in the past.'
                )
        return start_date

    def clean_end_date(self):
        """Validate that end_date is after start_date"""
        end_date = self.cleaned_data.get('end_date')
        start_date = self.cleaned_data.get('start_date')
        
        if start_date and end_date:
            if end_date < start_date:
                raise forms.ValidationError(
                    'End date must be after the start date.'
                )
        return end_date

    def clean(self):
        """Additional cross-field validation"""
        cleaned_data = super().clean()
        return cleaned_data
