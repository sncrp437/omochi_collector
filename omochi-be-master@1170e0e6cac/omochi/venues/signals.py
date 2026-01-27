from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from omochi.menus.models import MenuCategory
from omochi.venues.models import Venue, VenueManager
from omochi.notifications.fcm_topic_service import fcm_topic_service

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Venue)
def create_default_menu_categories(sender, instance, created, **kwargs):
    if created:
        default_categories = [
            {"name": "メイン", "name_en": "Main"},
            {"name": "サイド", "name_en": "Side"},
            {"name": "飲み物", "name_en": "Drinks"},
            {"name": "その他", "name_en": "Others"},
            {"name": "アルコール", "name_en": "Alcohol"},
        ]
        for index, category in enumerate(default_categories):
            MenuCategory.objects.create(
                venue=instance,
                name=category["name"],
                name_en=category["name_en"],
                display_order=index,
            )


@receiver(post_save, sender=VenueManager)
def unsubscribe_venue_manager_from_topic(sender, instance, created, **kwargs):
    """
    When a user is assigned as venue manager, delegate to FCMTopicService.
    """
    from omochi.notifications.fcm_topic_service import fcm_topic_service
    
    if created:
        user = instance.user
        fcm_topic_service.handle_venue_manager_assignment(user)


@receiver(post_delete, sender=VenueManager)
def resubscribe_user_to_topic_if_no_venues(sender, instance, **kwargs):
    """
    When a venue manager is removed, delegate to FCMTopicService if they no longer manage any venues.
    """
    
    user = instance.user
    
    # Check if user still manages any other venues
    still_manages_venues = user.managed_venues.exists()
    
    if not still_manages_venues:
        fcm_topic_service.handle_venue_manager_removal(user)
