from django.apps import AppConfig


class ReservationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'omochi.reservations'

    def ready(self):
        import omochi.reservations.signals
