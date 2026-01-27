from django.urls import path
from .views import ArticleListAPIView, ArticleDetailAPIView

urlpatterns = [
    path('', ArticleListAPIView.as_view(), name='article-list'),
    path('<uuid:id>/', ArticleDetailAPIView.as_view(), name='article-detail'),
]