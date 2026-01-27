from django.urls import path
from .views import PrefecturesWithStationsView

urlpatterns = [
    path('prefectures/', PrefecturesWithStationsView.as_view(), name='prefectures-with-stations'),
] 