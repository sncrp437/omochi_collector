
---
# OpenAI Translation Integration

This document describes the OpenAI translation integration for the Omochi platform, enabling automatic content translation in Django Admin, management commands, and programmatic APIs.

## Overview

Omochi uses OpenAI to:
- Translate content fields in models (e.g., articles, menu items)
- Support bulk and single translation in Django Admin
- Provide management commands for batch translation
- Allow programmatic translation via service API

## Setup

### Environment Variables

Add the following to your `.env` file:
```
OPENAI_API_KEY=your-actual-openai-api-key-here
```

### Django Settings

Add to `omochi/settings.py`:
```python
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
OPENAI_MAX_TOKENS = int(os.environ.get('OPENAI_MAX_TOKENS', '5000'))
OPENAI_TEMPERATURE = float(os.environ.get('OPENAI_TEMPERATURE', '0.2'))
```

## Models

No new fields are required for OpenAI integration. Translation is performed on existing model fields (e.g., `title`, `description`, `summary`, etc.).

## Admin Integration

### Features
- **Translate Button**: Each object has a "🔄 Translate to English" button
- **Translation Form**: Select target/source language, context, and fields to translate

### Example: Venues
```python
from django.contrib import admin
from omochi.common.openai_service import OpenAIService
from .models import Venue
from .forms import VenueAdminForm

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    form = VenueAdminForm
    list_display = (
        'name', 'name_en', 'address', 'nearest_station', 'phone_number', 'email', 'is_active',
        'opening_time', 'closing_time', 'stripe_account_status', 'charges_enabled',
    )
    # ...existing config...
    # Example translation integration:
    def _handle_translation_request(self, request, object_id):
        try:
            venue = self.get_object(request, object_id)
            field_name = request.POST.get('translate_field')
            text = request.POST.get('translate_text', '').strip()
            openai_service = OpenAIService()
            result = openai_service.translate_text(
                text=text,
                target_language='English',
                source_language='Japanese',
                field_type=field_name
            )
            if result['success']:
                setattr(venue, field_name, text)
                en_field = f"{field_name}_en"
                if hasattr(venue, en_field):
                    setattr(venue, en_field, result['translated_text'])
                    venue.save()
        except Exception as e:
            pass
```

### Example: Menu Items
```python
from omochi.common.openai_admin import register_with_openai

@register_with_openai(
    translatable_fields_param=['title', 'description', 'price_text'],
    context="restaurant menu item"
)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'category']
```

## Management Command

### Command
```bash
python manage.py translate_content app_name.ModelName --target-language="Target Language" --fields="field1,field2"
```

### Options
- `--target-language`: Target language (required)
- `--source-language`: Source language (default: auto)
- `--fields`: Fields to translate (required)
- `--context`: Context for translation
- `--filter`: JSON filter for queryset
- `--limit`: Limit number of objects
- `--dry-run`: Preview only
- `--batch-size`: Objects per batch (default: 10)

### Examples
```bash
# Translate all articles to Japanese
python manage.py translate_content articles.Article \
    --target-language="Japanese" \
    --fields="title,description,summary,content" \
    --context="blog article about restaurants"

# Translate with filter and limit
python manage.py translate_content articles.Article \
    --target-language="Vietnamese" \
    --fields="title,description" \
    --filter='{"created_at__gte": "2024-01-01"}' \
    --limit=10

# Dry run to preview
python manage.py translate_content articles.Article \
    --target-language="Korean" \
    --fields="title,description" \
    --dry-run
```

## API Endpoints

No dedicated endpoints for translation. Use the programmatic service in your views or APIs as needed.

## Programmatic Usage

### Service Example
```python
from omochi.common.openai_service import get_openai_service

service = get_openai_service()
result = service.translate_text(
    text="Hello, welcome to our restaurant!",
    target_language="Japanese",
    source_language="English",  # Optional
    field_type="general",       # Optional
    context="restaurant greeting"
)
if result['success']:
    print(f"Translated: {result['translated_text']}")
    print(f"Tokens used: {result['usage']['total_tokens']}")
else:
    print(f"Error: {result['error']}")
```

### Multiple Fields Example
```python
fields_data = {
    'title': 'Delicious Sushi',
    'description': 'Fresh sushi made daily',
    'ingredients': 'Salmon, rice, nori'
}
for field, text in fields_data.items():
    result = service.translate_text(
        text=text,
        target_language="Vietnamese",
        field_type=field,
        context="sushi menu item"
    )
    if result['success']:
        print(f"{field}: {result['translated_text']}")
```

## Testing

Run integration tests:
```bash
python test_openai_integration.py
```
Tests will check:
- OpenAI API key configuration
- Service initialization
- Translation functionality
- Admin integration
- Management command

## Troubleshooting

### API Key Error
```
ValueError: OPENAI_API_KEY is not configured in settings
```
→ Check your `.env` file for `OPENAI_API_KEY`

### Model Not Found
```
openai.NotFoundError: The model `gpt-4` does not exist
```
→ Change the model in settings or .env: `OPENAI_MODEL=gpt-4o-mini`

### Rate Limit Error
```
openai.RateLimitError: Rate limit exceeded
```
→ Reduce `batch_size` or add delay

### Template Not Found
```
TemplateDoesNotExist: admin/openai_translate.html
```
→ Restart Django server after adding templates

## Cost & Optimization

### Recommended Models
- **gpt-4o-mini**: Cost-effective, fast translation (~$0.0005/1K tokens)
- **gpt-4o**: Higher quality (~$0.005/1K tokens)

### Optimization Tips
1. Use `OPENAI_TEMPERATURE=0.2` or lower for consistent translation
2. Batch translation to reduce API calls
3. Cache translation results if possible
4. Use concise, meaningful context

### Estimated Cost
- 1 article (1000 words) ≈ 1500 tokens ≈ $0.0008 (gpt-4o-mini)
- 100 menu items (100 words each) ≈ 15000 tokens ≈ $0.0075

## Migration & Backup

Before running batch translation:
```bash
# Backup database
python manage.py dumpdata articles.Article > articles_backup.json

# Test with dry-run first
python manage.py translate_content articles.Article \
    --target-language="Japanese" \
    --fields="title" \
    --limit=1 \
    --dry-run

# Run actual translation with small batch
python manage.py translate_content articles.Article \
    --target-language="Japanese" \
    --fields="title" \
    --limit=5 \
    --batch-size=1
```

## Support

If you have issues:
- Check logs: `tail -f logs/django.log`
- Run tests: `python test_openai_integration.py`
- View debug info with `--verbosity=2`
- Check OpenAI dashboard for usage and errors