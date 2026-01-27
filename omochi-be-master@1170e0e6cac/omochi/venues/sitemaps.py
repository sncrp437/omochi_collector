from omochi.common.sitemaps import BaseSitemap
from .models import Venue


class VenueSitemap(BaseSitemap):
    def items(self):
        # Only select necessary fields for better performance
        return Venue.objects.only('id', 'updated_at').order_by('-created_at')

    def location(self, venue):
        return f"/store/{venue.id}"

    def lastmod(self, venue):
        return venue.updated_at
