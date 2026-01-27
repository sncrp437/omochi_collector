from django.contrib.sitemaps import Sitemap
from django.conf import settings
from urllib.parse import urlparse
from omochi.common.utils import get_timezone_date


class BaseSitemap(Sitemap):
    """Base sitemap class with common functionality"""
    changefreq = "weekly"
    priority = 0.5

    def get_latest_lastmod(self):
        """Return current date in Japan timezone for sitemap index"""
        return get_timezone_date()

    def get_urls(self, page=1, site=None, protocol=None):
        """Override to use frontend URL"""
        urls = super().get_urls(page=page, site=site, protocol=protocol)
        
        frontend_url = getattr(settings, "FRONTEND_URL", "https://omochiapp.com").rstrip("/")
        
        for url_info in urls:
            parsed = urlparse(url_info["location"])
            url_info["location"] = f"{frontend_url}{parsed.path}"
        
        return urls