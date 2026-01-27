import uuid
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

class SystemSetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=255, unique=True)
    value = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_setting'

    def __str__(self):
        return self.key


@receiver(post_save, sender='system_setting.SystemSetting')
@receiver(post_delete, sender='system_setting.SystemSetting')
def invalidate_system_setting_cache(sender, instance, **kwargs):
    """
    Invalidate cache when SystemSetting is saved or deleted
    """
    from .services import SystemSettingService
    SystemSettingService.invalidate_cache(instance.key)
