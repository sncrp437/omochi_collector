from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.db.models import Prefetch
from ..models import Article, ArticleVenueAffiliate
from .serializers import ArticleListSerializer, ArticleDetailSerializer


class ArticlePagination(PageNumberPagination):
    """Custom pagination for articles"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 20


class ArticleListAPIView(generics.ListAPIView):
    """
    API view to list all articles with pagination
    No authentication required
    """
    serializer_class = ArticleListSerializer
    pagination_class = ArticlePagination
    permission_classes = [AllowAny]  # Override global permission
    
    def get_queryset(self):
        """Get all articles ordered by creation date (newest first)"""
        return Article.objects.order_by('-created_at')


class ArticleDetailAPIView(generics.RetrieveAPIView):
    """
    API view to get article detail by ID
    No authentication required
    """
    serializer_class = ArticleDetailSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]  # Override global permission
    
    def get_queryset(self):
        """Get article with optimized queries for venue affiliates"""
        return Article.objects.prefetch_related(
            Prefetch(
                'venue_affiliates',
                queryset=ArticleVenueAffiliate.objects.select_related('venue').order_by('order', 'created_at')
            )
        )