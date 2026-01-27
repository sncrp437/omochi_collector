"""
Template tags for building absolute URLs in templates
"""
from django import template
from django.http import HttpRequest
from omochi.common.utils import build_absolute_url, build_absolute_image_url

register = template.Library()


@register.simple_tag(takes_context=True)
def absolute_url(context, file_field):
    """
    Template tag to build absolute URL for a file field.
    
    Usage in templates:
    {% load url_utils %}
    {% absolute_url venue.logo %}
    """
    request = context.get('request')
    return build_absolute_url(file_field, request)


@register.simple_tag(takes_context=True)
def absolute_image_url(context, image_field):
    """
    Template tag to build absolute URL for an image field.
    
    Usage in templates:
    {% load url_utils %}
    {% absolute_image_url venue.logo %}
    """
    request = context.get('request')
    return build_absolute_image_url(image_field, request)


@register.filter
def absolute_url_filter(file_field):
    """
    Filter version for building absolute URLs without request context.
    
    Usage in templates:
    {% load url_utils %}
    {{ venue.logo|absolute_url_filter }}
    """
    return build_absolute_url(file_field)


@register.filter
def absolute_image_url_filter(image_field):
    """
    Filter version for building absolute image URLs without request context.
    
    Usage in templates:
    {% load url_utils %}
    {{ venue.logo|absolute_image_url_filter }}
    """
    return build_absolute_image_url(image_field)
