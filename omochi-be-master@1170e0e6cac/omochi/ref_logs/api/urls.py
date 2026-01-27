from django.urls import path

from .views import RefLogClickAPIView

urlpatterns = [
    path('click/', RefLogClickAPIView.as_view(), name='ref-log-click'),
]
