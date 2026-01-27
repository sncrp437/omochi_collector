from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MenuCategoryViewSet, MenuItemViewSet

category_router = DefaultRouter()
category_router.register(r'categories', MenuCategoryViewSet, basename='menu-categories')

item_router = DefaultRouter()
item_router.register(r'items', MenuItemViewSet, basename='menu-items')

urlpatterns = [
    path('', include(category_router.urls)),
    path('', include(item_router.urls)),
]