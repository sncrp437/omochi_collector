from django import forms
from django.core.exceptions import ValidationError
from .models import Article, ArticleVenueAffiliate


class ArticleAdminForm(forms.ModelForm):
    """Custom admin form for Article model with enhanced validation"""

    # Explicitly define fields to prevent Django from stripping whitespace  
    description = forms.CharField(
        strip=False,
        required=True,
        widget=forms.Textarea(attrs={
            'rows': 4, 
            'cols': 50,
            'placeholder': 'Enter article description...'
        }),
        help_text='A brief description of the article'
    )
    summary = forms.CharField(
        strip=False,
        required=True,
        widget=forms.Textarea(attrs={
            'rows': 4,
            'cols': 50,
            'placeholder': 'Enter article summary...'
        }),
    help_text='A summary of the article'
    )
    content = forms.CharField(
        strip=False,
        required=True,
        widget=forms.Textarea(attrs={
            'rows': 10,
            'cols': 80,
            'placeholder': 'Enter article content...'
        }),
        help_text='The main content of the article to be displayed to readers'
    )
    
    class Meta:
        model = Article
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make title required and add help text
        self.fields['title'].required = True
        self.fields['title'].help_text = 'Enter a compelling article title (max 150 characters)'
    
    def clean_title(self):
        """Validate title"""
        title = self.cleaned_data.get('title', '')
        if not title.strip():
            raise ValidationError('Title is required')
        return title.strip()


class ArticleVenueAffiliateAdminForm(forms.ModelForm):
    """Custom admin form for ArticleVenueAffiliate model"""
    
    class Meta:
        model = ArticleVenueAffiliate
        fields = '__all__'
        widgets = {
            'title': forms.TextInput(attrs={
                'placeholder': 'Title for the venue affiliate link'
            }),
            'social_link': forms.URLInput(attrs={
                'placeholder': 'https://example.com/social'
            }),
            'menu_link': forms.URLInput(attrs={
                'placeholder': 'https://omochiapp.com/store/id'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['venue'].help_text = 'Select a venue (optional - can be blank)'
        self.fields['venue'].required = False
        self.fields['title'].help_text = 'Display name for this venue affiliate'
        self.fields['social_link'].help_text = 'Link to venue social media page'
        self.fields['menu_link'].help_text = 'Link to venue menu'
        self.fields['order'].help_text = 'Display order (lower numbers appear first)'
