from django.urls import path
from . import views

app_name = 'campaigns_api'

urlpatterns = [
    path('', views.CampaignListView.as_view(), name='campaign-list'),
]