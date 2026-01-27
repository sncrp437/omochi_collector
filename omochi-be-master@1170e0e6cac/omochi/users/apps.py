from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'omochi.users'
    
    def ready(self):
        import omochi.users.signals  # noqa
