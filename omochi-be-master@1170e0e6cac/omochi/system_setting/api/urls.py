from django.urls import path
from omochi.system_setting.api.views import ApplicationFeeView

urlpatterns = [
    path('application-fee/', ApplicationFeeView.as_view(), name='application-fee'),
]