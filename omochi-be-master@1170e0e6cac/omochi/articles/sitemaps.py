from omochi.common.sitemaps import BaseSitemap
from .models import Article


class ArticleSitemap(BaseSitemap):
    def items(self):
        # Only select necessary fields for better performance
        return Article.objects.only('id', 'updated_at').order_by('-created_at')

    def location(self, article):
        return f"/article/{article.id}"

    def lastmod(self, article):
        return article.updated_at
