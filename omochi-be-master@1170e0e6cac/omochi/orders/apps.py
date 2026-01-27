from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'omochi.orders'
    
    def ready(self):
        import omochi.orders.signals  # Import signals module to register signal handlers
