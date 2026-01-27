from django.contrib import admin
from django.contrib import messages
from django.shortcuts import redirect

from omochi.common.openai_service import get_openai_service
from .models import MenuCategory, MenuItem
from .forms import MenuItemAdminForm


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'name_en',
        'venue',
        'display_order',
        'created_at',
        'updated_at',
    )
    list_filter = ('name', 'venue',)
    search_fields = ('name', 'name_en', 'description')
    ordering = ('display_order',)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    form = MenuItemAdminForm
    list_display = (
        'name',
        'name_en', 
        'venue',
        'category',
        'price',
        'take_out_price',
        'is_available',
        'is_out_of_stock',
        'created_at',
        'updated_at',
    )
    list_filter = (
        'venue',
        'category',
        'is_available',
        'is_out_of_stock',
    )
    search_fields = (
        'name',
        'name_en',
        'venue__name',
        'category__name',
        'description',
        'description_en',
        'ingredients',
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    # Use custom template for change form
    change_form_template = 'admin/menus_menuitem_change_form.html'

    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Override change view to handle translation requests"""
        if request.method == 'POST' and 'translate_action' in request.POST:
            return self._handle_translation_request(request, object_id)
        
        return super().change_view(request, object_id, form_url, extra_context)

    def _handle_translation_request(self, request, object_id):
        """Handle server-side translation without AJAX"""
        try:
            menu_item = self.get_object(request, object_id)
            if not menu_item:
                messages.error(request, "Menu item not found")
                return self._redirect_back(request, object_id)

            field_name = request.POST.get('translate_field')
            text = request.POST.get('translate_text', '').strip()

            # Handle potential URL decoding if needed
            try:
                import urllib.parse
                # Try to decode if it looks like URL encoded
                if '%' in text:
                    decoded_text = urllib.parse.unquote(text)
                    # Only use decoded if it's different and valid
                    if decoded_text != text and len(decoded_text) > 0:
                        text = decoded_text
            except Exception:
                # If decoding fails, use original text
                pass

            if not text:
                messages.error(request, "No text to translate")
                return self._redirect_back(request, object_id)

            # Initialize OpenAI service
            openai_service = get_openai_service()

            # Call OpenAI translation with field_type
            result = openai_service.translate_text(
                text=text,
                target_language='English',
                source_language='Japanese',
                field_type=field_name,
                context="restaurant menu item"
            )

            if result['success']:
                # Update BOTH the source field and corresponding English field
                # This preserves the user's input data
                setattr(menu_item, field_name, text)  # Save the Japanese text user entered
                
                en_field = f"{field_name}_en"
                if hasattr(menu_item, en_field):
                    setattr(menu_item, en_field, result['translated_text'])  # Save translated English
                    menu_item.save()
                    
                    messages.success(
                        request, 
                        f"Successfully translated '{field_name}' to English: {result['translated_text'][:50]}..."
                    )
                else:
                    messages.error(request, f"English field '{en_field}' not found")
            else:
                messages.error(request, f"Translation failed: {result.get('error', 'Unknown error')}")

        except Exception as e:
            messages.error(request, f"Translation error: {str(e)}")

        return self._redirect_back(request, object_id)

    def _redirect_back(self, request, object_id):
        """Redirect back to the change form"""
        from django.urls import reverse
        return redirect(reverse(
            f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change', 
            args=[object_id]
        ))
