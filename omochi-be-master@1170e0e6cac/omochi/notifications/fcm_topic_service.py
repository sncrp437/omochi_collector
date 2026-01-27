"""
FCM Topic Subscription Service

Centralized service for managing Firebase Cloud Messaging topic subscriptions.
Handles all business logic related to subscribing/unsubscribing users from language-specific topics.
"""
import logging
from typing import List, Optional
from django.conf import settings

from omochi.notifications.services import FirebaseNotificationService

logger = logging.getLogger(__name__)


class FCMTopicService:
    """Service for managing FCM topic subscriptions based on user language preferences"""
    
    def __init__(self):
        self.firebase_service = FirebaseNotificationService()
        self.topic_ja = getattr(settings, 'FIREBASE_TOPIC_JA', 'all-users-ja')
        self.topic_en = getattr(settings, 'FIREBASE_TOPIC_EN', 'all-users-en')
    
    def get_topic_for_language(self, language: str) -> str:
        """
        Get the appropriate topic name for a given language.
        
        Args:
            language: User's preferred language (e.g., 'ja', 'en', 'ja-JP')
            
        Returns:
            Topic name string
        """
        if language.startswith('ja'):
            return self.topic_ja
        else:
            return self.topic_en
    
    def subscribe_user_tokens(self, user, unsubscribe_from_other: bool = False) -> dict:
        """
        Subscribe all active tokens of a user to their language-specific topic.
        
        Args:
            user: User instance
            unsubscribe_from_other: Whether to unsubscribe from the opposite language topic first
            
        Returns:
            dict with 'success_count' and 'failure_count'
        """
        from omochi.users.models import FCMToken
        
        # Get all active tokens
        tokens = list(FCMToken.objects.filter(
            user=user, 
            is_active=True
        ).values_list('token', flat=True))
        
        if not tokens:
            logger.info(f"No active tokens found for user {user.email}")
            return {'success_count': 0, 'failure_count': 0}
        
        target_topic = self.get_topic_for_language(user.preferred_language)
        
        # Unsubscribe from opposite topic if needed (e.g., when changing language)
        if unsubscribe_from_other:
            other_topic = self.topic_en if target_topic == self.topic_ja else self.topic_ja
            unsub_result = self.firebase_service.unsubscribe_from_topic_batch(tokens, other_topic)
            logger.info(
                f"Unsubscribed {unsub_result['success_count']}/{len(tokens)} tokens "
                f"for user {user.email} from topic '{other_topic}'"
            )
        
        # Subscribe to target topic
        result = self.firebase_service.subscribe_to_topic_batch(tokens, target_topic)
        logger.info(
            f"Subscribed {result['success_count']}/{len(tokens)} tokens "
            f"for user {user.email} to topic '{target_topic}'"
        )
        
        return result
    
    def unsubscribe_user_tokens(self, user, topics: Optional[List[str]] = None) -> dict:
        """
        Unsubscribe all active tokens of a user from specified topics.
        
        Args:
            user: User instance
            topics: List of topic names. If None, unsubscribes from all language topics
            
        Returns:
            dict with 'success_count' and 'failure_count'
        """
        from omochi.users.models import FCMToken
        
        tokens = list(FCMToken.objects.filter(
            user=user, 
            is_active=True
        ).values_list('token', flat=True))
        
        if not tokens:
            logger.info(f"No active tokens found for user {user.email}")
            return {'success_count': 0, 'failure_count': 0}
        
        # Default to all language topics
        if topics is None:
            topics = [self.topic_ja, self.topic_en]
        
        total_success = 0
        total_failure = 0
        
        for topic in topics:
            result = self.firebase_service.unsubscribe_from_topic_batch(tokens, topic)
            total_success += result['success_count']
            total_failure += result['failure_count']
            
            if result['success_count'] > 0:
                logger.info(
                    f"Unsubscribed {result['success_count']}/{len(tokens)} tokens "
                    f"for user {user.email} from topic '{topic}'"
                )
        
        return {'success_count': total_success, 'failure_count': total_failure}
    
    def handle_language_change(self, user, old_language: str, new_language: str) -> dict:
        """
        Handle user language change by resubscribing to appropriate topic.
        
        Args:
            user: User instance
            old_language: Previous language preference
            new_language: New language preference
            
        Returns:
            dict with 'success_count' and 'failure_count'
        """
        old_topic = self.get_topic_for_language(old_language)
        new_topic = self.get_topic_for_language(new_language)
        
        # Skip if topics are the same (e.g., ja -> ja-JP)
        if old_topic == new_topic:
            logger.info(
                f"Topics are the same ('{new_topic}') for user {user.email}, "
                f"skipping resubscription"
            )
            return {'success_count': 0, 'failure_count': 0}
        
        logger.info(
            f"User {user.email} changed language from '{old_language}' to '{new_language}'. "
            f"Resubscribing from '{old_topic}' to '{new_topic}'"
        )
        
        # Resubscribe with unsubscribe from old topic
        return self.subscribe_user_tokens(user, unsubscribe_from_other=True)
    
    def handle_venue_manager_assignment(self, user) -> dict:
        """
        Handle user being assigned as venue manager.
        Unsubscribes from all broadcast topics.
        
        Args:
            user: User instance
            
        Returns:
            dict with 'success_count' and 'failure_count'
        """
        logger.info(f"User {user.email} assigned as venue manager. Unsubscribing from all topics...")
        return self.unsubscribe_user_tokens(user)
    
    def handle_venue_manager_removal(self, user) -> dict:
        """
        Handle user being removed as venue manager.
        Resubscribes to language-specific topic.
        
        Args:
            user: User instance
            
        Returns:
            dict with 'success_count' and 'failure_count'
        """
        logger.info(
            f"User {user.email} no longer manages any venues. "
            f"Re-subscribing to language-specific topic..."
        )
        return self.subscribe_user_tokens(user, unsubscribe_from_other=False)


# Global instance
fcm_topic_service = FCMTopicService()
