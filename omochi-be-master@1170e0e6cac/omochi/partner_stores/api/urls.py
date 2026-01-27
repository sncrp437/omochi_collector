from django.urls import path
from .views import PartnerStoreListAPIView

urlpatterns = [
    path('', PartnerStoreListAPIView.as_view(), name='partner-store-list'),
]
