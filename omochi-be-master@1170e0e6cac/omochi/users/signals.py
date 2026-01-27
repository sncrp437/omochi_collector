from django.db.models.signals import pre_save
from django.dispatch import receiver
import logging

from omochi.notifications.fcm_topic_service import fcm_topic_service
from omochi.users.models import User

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=User)
def handle_language_change(sender, instance, **kwargs):
    """
    When user changes preferred_language, delegate to FCMTopicService to handle resubscription.
    """
    
    # Skip for new users (they'll be subscribed during token registration)
    if instance.pk is None:
        return
    
    try:
        # Get the old user instance from database
        old_user = User.objects.get(pk=instance.pk)
        
        # Check if language has changed
        if old_user.preferred_language != instance.preferred_language:
            # Delegate to service
            fcm_topic_service.handle_language_change(
                user=instance,
                old_language=old_user.preferred_language,
                new_language=instance.preferred_language
            )
    
    except User.DoesNotExist:
        logger.warning(f"User {instance.pk} not found in database during language change")
    except Exception as e:
        logger.error(f"Error handling language change for user {instance.email}: {str(e)}")
