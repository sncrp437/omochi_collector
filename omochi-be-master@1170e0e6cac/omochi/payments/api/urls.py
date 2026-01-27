from django.urls import path, include
from rest_framework.routers import DefaultRouter
from omochi.payments.api import views

router = DefaultRouter()
router.register(r'transactions', views.PaymentTransactionViewSet, basename='payment-transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('create_checkout_session/', views.CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('check_status/', views.check_payment_status, name='check-payment-status'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
    path('webhook/connect/', views.stripe_connect_webhook, name='stripe-connect-webhook'),
]