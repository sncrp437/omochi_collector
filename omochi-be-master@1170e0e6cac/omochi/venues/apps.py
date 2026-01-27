from django.apps import AppConfig


class VenuesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'omochi.venues'

    def ready(self):
        import omochi.venues.signals
