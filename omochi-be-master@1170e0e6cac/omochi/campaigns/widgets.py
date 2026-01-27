from django import forms
from django.forms.widgets import Widget
from django.utils.safestring import mark_safe


# CSS styles as a constant
CHAR_COUNTER_CSS = '''
    <style>
    .char-counter {
        font-size: 12px;
        font-weight: normal;
        padding: 2px 0;
    }
    .field-title .char-counter,
    .field-description .char-counter#char-counter-description {
        height: auto;
        margin: auto 0 auto 15px;
        text-align: right;
        font-style: italic;
    }
    .char-counter.success {
        color: #28a745;
    }
    .char-counter.warning {
        color: #ffc107;
    }
    .char-counter.error {
        color: #dc3545;
        font-weight: bold;
    }
    </style>
'''


class CharCountTextInput(forms.TextInput):
    """Custom text input widget with character counter"""
    
    def __init__(self, attrs=None, max_length=None, strip_for_count=False):
        self.max_length = max_length or 50
        self.strip_for_count = strip_for_count
        default_attrs = {
            'class': 'char-count-input',
        }
        
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)
    
    def render(self, name, value, attrs=None, renderer=None):
        # Get the basic input HTML
        input_html = super().render(name, value, attrs, renderer)
        
        # Add character counter HTML
        counter_id = f"char-counter-{name}"
        current_count = len(str(value).strip() if self.strip_for_count and value else str(value)) if value else 0
        
        # Determine counter color class
        if current_count > self.max_length:
            counter_class = 'error'
        elif current_count > self.max_length * 0.9:
            counter_class = 'warning' 
        else:
            counter_class = 'success'
        
        # CSS styles inline (only for first widget)
        css_styles = CHAR_COUNTER_CSS
        
        counter_html = f'''
        <div id="{counter_id}" class="char-counter {counter_class}">
            {current_count}/{self.max_length} characters
        </div>
        '''
        
        # JavaScript for real-time counting
        js_code = f'''
        <script>
        (function() {{
            const input = document.querySelector('input[name="{name}"]');
            const counter = document.getElementById('{counter_id}');
            const maxLength = {self.max_length};
            const stripForCount = {str(self.strip_for_count).lower()};
            
            function updateCounter() {{
                // Strip value for counting if needed (only leading/trailing spaces)
                const valueForCount = stripForCount ? input.value.trim() : input.value;
                const currentLength = valueForCount.length;
                
                // Update counter color classes
                counter.className = 'char-counter';
                
                if (currentLength > maxLength) {{
                    counter.classList.add('error');
                    input.style.borderColor = '#dc3545';
                    counter.textContent = currentLength + '/' + maxLength + ' characters';
                }} else if (currentLength > 0) {{
                    counter.classList.add('success');
                    input.style.borderColor = '#28a745';
                    counter.textContent = currentLength + '/' + maxLength + ' characters';
                }} else {{
                    // Handle empty case
                    if (stripForCount && input.value.length > 0 && currentLength === 0) {{
                        // User typed only spaces (leading/trailing)
                        counter.classList.add('warning');
                        input.style.borderColor = '#ffc107';
                        counter.textContent = '0/' + maxLength + ' characters (spaces only)';
                    }} else {{
                        // Truly empty or normal empty case
                        input.style.borderColor = '';
                        counter.textContent = currentLength + '/' + maxLength + ' characters';
                    }}
                }}
            }}
            
            if (input && counter) {{
                input.addEventListener('input', updateCounter);
                input.addEventListener('paste', function() {{
                    setTimeout(updateCounter, 10);
                }});
                
                // Initial update
                updateCounter();
            }}
        }})();
        </script>
        '''
        
        return mark_safe(css_styles + input_html + counter_html + js_code)


class CharCountTextarea(forms.Textarea):
    """Custom textarea widget with real-time character counter"""
    
    def __init__(self, attrs=None, max_length=None):
        # Set very high default for unlimited behavior, or use None to disable counter
        self.max_length = max_length or 10000  # 10k chars should be enough for most cases
        self.show_counter = max_length is not None  # Only show counter if max_length is explicitly set
        default_attrs = {
            'rows': 5,
            'cols': 60,
            'class': 'char-count-textarea',
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)
    
    def render(self, name, value, attrs=None, renderer=None):
        # Get the basic textarea HTML
        textarea_html = super().render(name, value, attrs, renderer)
        
        # If no counter should be shown, return just the textarea
        if not self.show_counter:
            return textarea_html
        
        # Add character counter HTML
        counter_id = f"char-counter-{name}"
        
        # Normalize value for initial count
        if value:
            normalized_value = str(value).replace('\r\n', '\n').replace('\r', '\n')
            current_count = len(normalized_value)
        else:
            current_count = 0
        
        # Determine counter color class
        if current_count > self.max_length:
            counter_class = 'error'
        elif current_count > self.max_length * 0.9:
            counter_class = 'warning' 
        else:
            counter_class = 'success'
        
        # CSS styles inline (only for textarea widget) 
        css_styles = ''  # No CSS for second widget to avoid duplication
        
        counter_html = f'''
        <div id="{counter_id}" class="char-counter {counter_class}">
            {current_count}/{self.max_length} characters
        </div>
        '''
        
        # JavaScript for real-time counting
        js_code = f'''
        <script>
        (function() {{
            const textarea = document.querySelector('textarea[name="{name}"]');
            const counter = document.getElementById('{counter_id}');
            const maxLength = {self.max_length};
            
            function updateCounter() {{
                // Normalize line endings for accurate count
                const normalizedValue = textarea.value.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
                const currentLength = normalizedValue.length;
                
                // Update counter text
                counter.textContent = currentLength + '/' + maxLength + ' characters';
                
                // Update counter color classes
                counter.className = 'char-counter';
                if (currentLength > maxLength) {{
                    counter.classList.add('error');
                    textarea.style.borderColor = '#dc3545';
                }} else if (currentLength > 0) {{
                    counter.classList.add('success');
                    textarea.style.borderColor = '#28a745';
                }} else {{
                    // Reset to default
                    textarea.style.borderColor = '';
                    counter.classList.remove('success', 'warning', 'error');
                }}
            }}
            
            if (textarea && counter) {{
                textarea.addEventListener('input', updateCounter);
                textarea.addEventListener('paste', function() {{
                    setTimeout(updateCounter, 10);
                }});
                
                // Initial update
                updateCounter();
            }}
        }})();
        </script>
        '''
        
        return mark_safe(css_styles + textarea_html + counter_html + js_code)
