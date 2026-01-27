from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Reservation, TimeSlot
from django.utils.timezone import now
from omochi.notifications.services import firebase_service
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Reservation)
def store_previous_status(sender, instance, **kwargs):
    """
    Store the previous status of the Reservation before it's saved.
    """
    if instance.id:  # Only for existing instances (not newly created)
        try:
            # Get the current instance from the database
            previous_instance = Reservation.objects.get(id=instance.id)
            # Store the previous status
            instance._previous_status = previous_instance.status
            logger.debug(f"Storing previous status for reservation {instance.id}: {instance._previous_status}")
        except Reservation.DoesNotExist:
            # This is a new instance
            instance._previous_status = None
            logger.debug(f"No previous status for new reservation {instance.id}")

@receiver(post_save, sender=Reservation)
def update_time_slot_on_reservation_save(sender, instance, created, **kwargs):
    """
    Also send notifications for status changes.
    """
    logger.info(f"Reservation {instance.id} saved. Created: {created}, Status: {instance.status}")
    
    # Check if status changed and notify customer
    previous_status = getattr(instance, '_previous_status', None)

    if previous_status and previous_status != instance.status:
        logger.info(f"Status changed from {previous_status} to {instance.status}")
        # Send notification when status changes to READY
        if previous_status != 'READY' and instance.status == 'READY':
            try:
                firebase_service.send_reservation_status_notification(instance)
                logger.info(f"Status notification sent for reservation {instance.id}")
            except Exception as e:
                logger.error(f"Failed to send reservation status notification: {str(e)}")

