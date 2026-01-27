"""
URL configuration for omochi project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from django.contrib.sitemaps.views import sitemap, index
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from django.conf import settings
from django.conf.urls.static import static

# Import sitemaps
from omochi.articles.sitemaps import ArticleSitemap
from omochi.venues.sitemaps import VenueSitemap

# Sitemap configuration
sitemaps = {
    'article': ArticleSitemap,
    'store': VenueSitemap,
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    path(
        'api/redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
        name='redoc',
    ),
    # API endpoints
    path('api/auth/', include('omochi.users.api.urls')),
    path('api/venues/', include('omochi.venues.api.urls')),
    # Updated menus URL pattern with venues/<uuid:venue_id> prefix
    path(
        'api/venues/<uuid:venue_id>/menus/', include('omochi.menus.api.urls')
    ),
    path('api/orders/', include('omochi.orders.api.urls')),
    path('api/carts/', include('omochi.carts.api.urls')),
    path('api/reservations/', include('omochi.reservations.api.urls')),
    path('api/notifications/', include('omochi.notifications.api.urls')),
    path(
        'api/venues/<uuid:venue_id>/time-slots/',
        include('omochi.time_slots.api.urls'),
    ),
    path('api/payments/', include('omochi.payments.api.urls')),
    path('api/coupons/', include('omochi.coupons.api.urls')),
    path('api/stocked-venues/', include('omochi.stocked_venues.api.urls')),
    path('api/ref-logs/', include('omochi.ref_logs.api.urls')),
    path('api/system-settings/', include('omochi.system_setting.api.urls')),
    path('api/areas/', include('omochi.areas.api.urls')),
    path('api/campaigns/', include('omochi.campaigns.api.urls')),
    path('api/articles/', include('omochi.articles.api.urls')),
    path('api/partner-stores/', include('omochi.partner_stores.api.urls')),
    
    # Sitemap Index URL
    path('sitemap.xml', index, {'sitemaps': sitemaps}, name='sitemap_index'),
    
    # Individual Sitemap URLs  
    path('sitemap/<section>', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]

# Add media files serving in development
if not settings.USE_S3:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
