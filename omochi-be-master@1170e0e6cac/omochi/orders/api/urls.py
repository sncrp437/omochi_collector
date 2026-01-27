from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrderStatusHistoryViewSet, OrderViewSet, OrderFilterViewSet
from omochi.payments.api.views import order_payment

# Use router only for the default CRUD operations
router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

# Explicitly set up our filter views
order_status_history_list = OrderStatusHistoryViewSet.as_view({'get': 'list'})
order_by_venue = OrderFilterViewSet.as_view({'get': 'by_venue'})
order_my_orders = OrderFilterViewSet.as_view({'get': 'my_orders'})


urlpatterns = [
    # Custom filter paths that shouldn't conflict with router paths
    path('by-venue/', order_by_venue, name='orders-by-venue'),
    path('my-orders/', order_my_orders, name='my-orders'),
    
    # Include router URLs after our custom paths
    path('', include(router.urls)),
    
    # Order detail related paths - now using the router's basename
    path(
        '<uuid:order_id>/status-history/',
        order_status_history_list,
        name='order-status-history-list',
    ),
    path(
        '<uuid:order_id>/pay/',
        order_payment,
        name='order-payment',
    ),
]
