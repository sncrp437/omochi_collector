import logging
import json
import os
from typing import List, Dict, Optional
from django.conf import settings
from django.utils.translation import gettext as _, activate
import firebase_admin
from firebase_admin import credentials, messaging
from omochi.settings import FRONTEND_URL
from omochi.notifications.models import Notification
from omochi.common.utils import get_day_utc_range, build_absolute_url
from django.utils.translation import override
from omochi.common.multilingual_venue_service import MultilingualVenueFieldService


logger = logging.getLogger(__name__)


class FirebaseNotificationService:
    """
    Service for sending Firebase Cloud Messaging (FCM) notifications using V1 API
    """
    
    def __init__(self):
        self.app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if firebase_admin._apps:
                self.app = firebase_admin.get_app()
                return
            
            # Get Firebase credentials from environment variables
            firebase_credentials_json = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '')
            project_id = getattr(settings, 'FIREBASE_PROJECT_ID', '')
            
            # First try with JSON string from environment
            if firebase_credentials_json:
                try:
                    # Parse JSON credentials
                    credentials_dict = json.loads(firebase_credentials_json)
                    
                    # Initialize Firebase Admin SDK with credentials dictionary
                    cred = credentials.Certificate(credentials_dict)
                    self.app = firebase_admin.initialize_app(cred, {
                        'projectId': project_id
                    })
                    
                    logger.info("Firebase Admin SDK initialized successfully from JSON string")
                    return
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in FIREBASE_CREDENTIALS_JSON: {str(e)}")
            
            # Fall back to credentials file path if JSON string is not available
            credentials_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '')
            if credentials_path and os.path.exists(credentials_path):
                cred = credentials.Certificate(credentials_path)
                self.app = firebase_admin.initialize_app(cred, {
                    'projectId': project_id
                })
                logger.info("Firebase Admin SDK initialized successfully from file path")
                return
            
            logger.warning("Firebase credentials not found or not configured properly")
            return
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
            self.app = None
    
    def is_configured(self) -> bool:
        """Check if Firebase is properly configured"""
        return self.app is not None
    
    def send_notification_to_user(
        self, 
        user, 
        title: str, 
        body: Optional[str] = None, 
        data: Optional[Dict] = None,
        click_action: Optional[str] = None,
        save_to_db: bool = True,
        title_en: Optional[str] = None,
        message_en: Optional[str] = None,
    ) -> bool:
        """
        Send notification to all active devices of a user.
        - Persist both JA (title/body) and optional EN (title_en/message_en).
        - Choose send text based on user.preferred_language (normalize with startswith).
        """
        logger.info(f"Sending notification to user {user.id} - Title: {title!r}, Body: {body!r}")

        notification = None
        if save_to_db:
            notification = self._save_notification_to_db(
                user=user,
                title=title,
                body=body,
                click_action=click_action,
                data=data,
                title_en=title_en,
                message_en=message_en,
            )

        if not self.is_configured():
            logger.error("Firebase is not configured")
            return False

        # Get all active FCM tokens for the user
        fcm_tokens = list(user.get_active_fcm_tokens())
        if not fcm_tokens:
            logger.info(f"No active FCM tokens found for user {user.email}")
            return False

        # Ensure data is a dict before adding notificationId
        if data is None and save_to_db:
            data = {}
        # notification may be None if save failed or save_to_db is False
        data['notificationId'] = str(notification.id) if notification else None

        # prefer normalized language check (handles 'en', 'en-US', etc.)
        lang = (getattr(user, 'preferred_language', '') or 'ja').lower()
        is_en = lang.startswith('en')

        # Determine send_title/send_body with robust fallbacks
        if notification:
            # Use persisted values first (they reflect what was actually saved)
            if is_en:
                send_title = (notification.title_en or title_en or notification.title or title)
                send_body = (notification.message_en or message_en or notification.message or body)
            else:
                send_title = (notification.title or title)
                send_body = (notification.message or body)
        else:
            # No saved notification: fall back to provided args
            if is_en:
                send_title = title_en or title
                send_body = message_en or body
            else:
                send_title = title
                send_body = body

        return self._send_to_tokens(
            tokens=fcm_tokens,
            title=send_title or '',
            body=send_body or '',
            data=data,
            click_action=click_action
        )
    
    def send_notification_to_tokens(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        click_action: Optional[str] = None,
        user=None,
        save_to_db: bool = False
    ) -> bool:
        """
        Send notification to specific FCM tokens
        
        Args:
            tokens: List of FCM tokens
            title: Notification title
            body: Notification body
            data: Additional data payload
            click_action: URL to open when notification is clicked
            user: User instance (for saving to database)
            save_to_db: Whether to save notification to database
            
        Returns:
            bool: True if at least one notification was sent successfully
        """
        # Save notification to database if user is provided and save_to_db is True
        if save_to_db and user:
            self._save_notification_to_db(
                user=user,
                title=title,
                body=body,
                data=data,
                click_action=click_action
            )
        
        if not self.is_configured():
            logger.error("Firebase is not configured")
            return False
        
        return self._send_to_tokens(
            tokens=tokens,
            title=title,
            body=body,
            data=data,
            click_action=click_action
        )
    
    def _send_to_tokens(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        click_action: Optional[str] = None
    ) -> bool:
        """
        Internal method to send notifications to FCM tokens using V1 API
        """
        if not tokens:
            return False
        
        if click_action:
            data = data or {}
            data.update({
                'clickAction': click_action,
            })
        
        try:
            # Prepare notification data
            notification_data = data or {}
            
            # Prepare web push config with click action (only for HTTPS URLs)
            webpush_config = None
            if click_action and click_action.startswith('https://'):
                webpush_config = messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(
                        link=click_action
                    )
                )
            elif click_action and not click_action.startswith('https://'):
                logger.warning(f"Click action URL is not HTTPS, skipping webpush config: {click_action}")
            
            # Create notification object
            notification = messaging.Notification(
                title=title,
                body=body
            )
            
            success_count = 0
            invalid_tokens = []
            
            # Send to each token individually to track failures
            for token in tokens:
                try:
                    message = messaging.Message(
                        notification=notification,
                        data={k: str(v) for k, v in notification_data.items()},  # Convert all values to strings
                        token=token,
                        webpush=webpush_config
                    )
                    
                    # Send the message
                    response = messaging.send(message)
                    logger.info(f"Successfully sent message to token {token[:20]}...: {response}")
                    success_count += 1
                    
                    # Mark token as used
                    self._mark_token_as_used(token)
                    
                except messaging.UnregisteredError:
                    logger.info(f"Token is unregistered: {token[:20]}...")
                    invalid_tokens.append(token)
                except messaging.SenderIdMismatchError:
                    logger.info(f"Sender ID mismatch for token: {token[:20]}...")
                    invalid_tokens.append(token)
                except Exception as e:
                    logger.error(f"Error sending to token {token[:20]}...: {str(e)}")
                    invalid_tokens.append(token)
            
            # Handle invalid tokens
            if invalid_tokens:
                self._handle_invalid_tokens(invalid_tokens)
            
            logger.info(f"Successfully sent {success_count}/{len(tokens)} notifications")
            return success_count > 0
                
        except Exception as e:
            logger.error(f"Error sending FCM notification: {str(e)}")
            return False
    
    def _handle_invalid_tokens(self, tokens: List[str]):
        """
        Handle invalid or expired FCM tokens by deactivating them
        """
        from omochi.users.models import FCMToken
        
        for token in tokens:
            logger.info(f"Deactivating invalid FCM token: {token[:20]}...")
            FCMToken.deactivate_token(token)
    
    def _mark_token_as_used(self, token: str):
        """
        Mark FCM token as recently used
        """
        from omochi.users.models import FCMToken
        
        try:
            fcm_token = FCMToken.objects.get(token=token, is_active=True)
            fcm_token.mark_as_used()
        except FCMToken.DoesNotExist:
            pass
    
    def _save_notification_to_db(
        self,
        user,
        title: str,
        body: str,
        click_action: Optional[str] = None,
        data: Optional[Dict] = None,
        title_en: Optional[str] = None,
        message_en: Optional[str] = None,
    ):
        """
        Save notification to database
        """
        
        try:
            # Determine notification type from data
            notification_type = 'SYSTEM'  # default
            reference_id = None
            reference_type = None
            
            if data:
                if data.get('type') == 'order_status':
                    notification_type = 'ORDER_STATUS'
                    reference_id = data.get('order_id')
                    reference_type = 'order'
                elif data.get('type') == 'new_order':
                    notification_type = 'NEW_ORDER'
                    reference_id = data.get('order_id')
                    reference_type = 'order'
                elif data.get('type') == 'reservation':
                    notification_type = 'RESERVATION'
                    reference_id = data.get('reservation_id')
                    reference_type = 'reservation'
                elif data.get('type') == 'time_slot_available':
                    notification_type = 'TIME_SLOT_AVAILABLE'
                    reference_id = data.get('venue_id')
                    reference_type = 'venue'
            
            # Create notification record WITHOUT image_url
            # We'll get the venue logo dynamically when displaying notifications
            notification = Notification.objects.create(
                user=user,
                title=title,
                title_en=title_en or '',
                message=body or '',
                message_en=message_en or '',
                type=notification_type,
                reference_id=reference_id,
                reference_type=reference_type,
                click_action=click_action,
                status='UNREAD'
            )
            
            logger.info(f"Notification saved to database with ID: {notification.id}")
            return notification
            
        except Exception as e:
            logger.error(f"Error saving notification to database: {str(e)}")
            return None
    
    def get_venue_logos_for_notifications(self, notifications):
        """
        Get venue logos for a list of notifications
        Groups notifications by reference_type and batch fetches venue logos
        
        Args:
            notifications: QuerySet or list of Notification objects
            
        Returns:
            Dict mapping notification ID to venue logo URL
        """
        from omochi.venues.models import Venue
        from omochi.orders.models import Order
        from omochi.reservations.models import Reservation
        
        notification_logos = {}
        
        # Convert to list if it's a queryset
        if hasattr(notifications, 'all'):
            notifications = list(notifications)
        
        # Group notifications by reference_type
        order_ids = []
        reservation_ids = []
        venue_ids = []
        
        for notification in notifications:
            if notification.reference_type == 'order' and notification.reference_id:
                order_ids.append(notification.reference_id)
            elif notification.reference_type == 'reservation' and notification.reference_id:
                reservation_ids.append(notification.reference_id)
            elif notification.reference_type == 'venue' and notification.reference_id:
                venue_ids.append(notification.reference_id)
        
        # Initialize maps
        order_venue_map = {}
        reservation_venue_map = {}
        venue_logo_map = {}
        
        # Batch query for orders -> venue logos
        if order_ids:
            orders_venues = Order.objects.filter(
                id__in=order_ids
            ).select_related('venue')

            order_venue_map = {str(order.id): order.venue.logo for order in orders_venues}

        # Batch query for reservations -> venue logos
        if reservation_ids:
            reservations_venues = Reservation.objects.filter(
                id__in=reservation_ids
            ).select_related('venue')

            reservation_venue_map = {str(reservation.id): reservation.venue.logo for reservation in reservations_venues}

        # Batch query for venues -> logos
        if venue_ids:
            venues = Venue.objects.filter(
                id__in=venue_ids
            )
            
            venue_logo_map = {str(venue.id): venue.logo for venue in venues}
        
        # Map back to notifications
        for notification in notifications:
            venue_logo_path = None
            
            if notification.reference_type == 'order' and notification.reference_id:
                venue_logo_path = order_venue_map.get(str(notification.reference_id))
            elif notification.reference_type == 'reservation' and notification.reference_id:
                venue_logo_path = reservation_venue_map.get(str(notification.reference_id))
            elif notification.reference_type == 'venue' and notification.reference_id:
                venue_logo_path = venue_logo_map.get(str(notification.reference_id))

            
            # Build absolute URL using the imported function
            if venue_logo_path:
                # Use the imported function from utils
                absolute_url = build_absolute_url(venue_logo_path)
                notification_logos[str(notification.id)] = absolute_url
            else:
                notification_logos[str(notification.id)] = None
        
        return notification_logos
    
    def send_multicast_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        click_action: Optional[str] = None,
        user=None,
        save_to_db: bool = False
    ) -> bool:
        """
        Send notification to multiple tokens using multicast (more efficient for many tokens)
        """
        # Save notification to database if user is provided and save_to_db is True
        if save_to_db and user:
            self._save_notification_to_db(
                user=user,
                title=title,
                body=body,
                data=data,
                click_action=click_action
            )
        
        if not self.is_configured() or not tokens:
            return False
        
        try:
            # Prepare notification data
            notification_data = data or {}
            
            # Prepare web push config with click action (only for HTTPS URLs)
            webpush_config = None
            if click_action and click_action.startswith('https://'):
                webpush_config = messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(
                        link=click_action
                    )
                )
            elif click_action and not click_action.startswith('https://'):
                logger.warning(f"Click action URL is not HTTPS, skipping webpush config: {click_action}")
            
            # Create multicast message
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data={k: str(v) for k, v in notification_data.items()},
                tokens=tokens,
                webpush=webpush_config
            )
            
            # Send multicast message
            response = messaging.send_multicast(message)
            
            logger.info(f"Multicast result: {response.success_count}/{len(tokens)} successful")
            
            # Handle failed tokens
            if response.failure_count > 0:
                failed_tokens = []
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        failed_tokens.append(tokens[idx])
                        logger.error(f"Failed to send to token {tokens[idx][:20]}...: {resp.exception}")
                
                self._handle_invalid_tokens(failed_tokens)
            
            return response.success_count > 0
            
        except Exception as e:
            logger.error(f"Error sending multicast FCM notification: {str(e)}")
            return False
    
    def send_order_status_notification(self, order, user=None):
        """
        Send notification when order status changes
        """
        target_user = user or order.user
        if not target_user:
            return False
        
        # Build messages in both languages
        status_key = order.status
        
        # Helper to build status messages dict under override
        def build_messages():
            msgs = {
                'CONFIRMED': _('Your order has been confirmed! 🎉'),
                'PREPARING': _('Your order is being prepared 👨‍🍳'),
                'READY': _('Your order is ready! Please pick it up at the store within the designated time.'),
                'COMPLETED': _('Thank you! Your order has been completed ✅'),
                'CANCELLED': _('Your order has been cancelled ❌'),
            }
            if order.status == 'READY':
                msgs['READY'] = _(
                    'Your table is ready! Please come to the store within the designated time!'
                    if order.order_type == 'DINE_IN'
                    else 'Your order is ready! Please pick it up at the store within the designated time.'
                )
            return msgs
        
        # detect venue name in both languages
        venue_name_ja = MultilingualVenueFieldService.get_venue_name(order.venue, request=None)
        venue_name_en = order.venue.name_en or order.venue.name if order.venue else ''

        with override('ja'):
            status_messages_ja = build_messages()
            title_ja = _("Store: %(venue_name)s") % {'venue_name': venue_name_ja}
            body_ja = status_messages_ja.get(status_key, _("Order status updated to %(status)s") % {'status': status_key})

        with override('en'):
            status_messages_en = build_messages()
            title_en = _("Store: %(venue_name)s") % {'venue_name':venue_name_en}
            body_en = status_messages_en.get(status_key, _("Order status updated to %(status)s") % {'status': status_key})
        
        data = {
            'type': 'order_status',
            'order_id': str(order.id),
            'order_code': order.order_code,
            'status': order.status,
            'venue_name': venue_name_ja,
        }

        click_action = f"{FRONTEND_URL}/user/orders/{order.id}"

        # Don't pass image_url to _save_notification_to_db anymore
        # The image will be fetched dynamically when displaying notifications

        return self.send_notification_to_user(
            user=target_user,
            title=title_ja,
            body=body_ja,
            title_en=title_en,
            message_en=body_en,
            data=data,
            click_action=click_action,
        )
    
    def send_reservation_status_notification(self, reservation, user=None):
        """
        Send notification when reservation status changes (store both JA and EN)
        """
        target_user = user or reservation.user
        if not target_user:
            return False

        status_key = reservation.status

        def build_messages():
            msgs = {
                'CONFIRMED': _('Your reservation has been confirmed! 🎉'),
                'PREPARING': _('We are preparing your table 👨‍🍳'),
                'READY': _('Your table is ready! Please come to the store within the designated time!'),
                'COMPLETED': _('Thank you for dining with us! ✅'),
                'CANCELLED': _('Your reservation has been cancelled ❌'),
            }
            return msgs

        venue_name_ja = MultilingualVenueFieldService.get_venue_name(reservation.venue, request=None)
        venue_name_en = reservation.venue.name_en or reservation.venue.name if reservation.venue else ''

        # Japanese
        with override('ja'):
            status_messages_ja = build_messages()
            title_ja = _("Store: %(venue_name)s") % {'venue_name': venue_name_ja}
            body_ja = status_messages_ja.get(status_key, _("Reservation status updated to %(status)s") % {'status': status_key})

        # English
        with override('en'):
            status_messages_en = build_messages()
            title_en = _("Store: %(venue_name)s") % {'venue_name': venue_name_en}
            body_en = status_messages_en.get(status_key, _("Reservation status updated to %(status)s") % {'status': status_key})

        data = {
            'type': 'reservation',
            'reservation_id': str(reservation.id),
            'reservation_code': reservation.reservation_code,
            'status': reservation.status,
            'venue_name': venue_name_ja,
        }

        click_action = f"{FRONTEND_URL}/user/reservation/{reservation.id}"

        return self.send_notification_to_user(
            user=target_user,
            title=title_ja,
            body=body_ja,
            title_en=title_en,
            message_en=body_en,
            data=data,
            click_action=click_action,
        )
    
    def send_new_order_notification_to_venue(self, order):
        if not order.venue:
            return False

        venue_managers = self._get_venue_managers(order.venue)
        if not venue_managers:
            logger.info(f"No managers found for venue {order.venue.id}")
            return False
        
        # Build title/body in both languages
        def build_title_body():
            title_tpl = _("#%(code)s") % {'code': order.order_code}
            body_tpl = _("New %(type)s order from %(customer_name)s") % {
                'type': order.order_type == 'TAKEOUT' and _('Takeout') or _('Eat-in'),
                'customer_name': order.user.get_full_name() if order.user else _('Guest')
            }
            return title_tpl, body_tpl

        with override('ja'):
            title_ja, body_ja = build_title_body()
        with override('en'):
            title_en, body_en = build_title_body()

        data = {
            'type': 'new_order',
            'order_id': str(order.id),
            'order_code': order.order_code,
            'order_type': order.order_type,
            'venue_id': str(order.venue.id),
            'total_amount': str(order.total_amount),
            'customer_name': order.user.get_full_name() if order.user else 'Guest',
        }

        click_action = f"{FRONTEND_URL}/venue/orders/{order.id}"

        success = False
        for manager in venue_managers:
            result = self.send_notification_to_user(
                user=manager,
                title=title_ja,
                body=body_ja,
                title_en=title_en,
                message_en=body_en,
                data=data,
                click_action=click_action,
                save_to_db=True  # Always save venue notifications to database
            )
            if result:
                success = True

        return success
    
    def send_new_reservation_notification_to_venue(self, reservation):
        """
        Send notification to venue managers when a new reservation is created
        """
        if not reservation.venue:
            return False
        
        # Get venue managers/staff
        venue_managers = self._get_venue_managers(reservation.venue)
        
        if not venue_managers:
            logger.info(f"No managers found for venue {reservation.venue.id}")
            return False

        # Build title/body in both languages
        def build_title_body():
            title_tpl = _("#%(code)s") % {'code': reservation.reservation_code}
            body_tpl = _("New %(type)s order from %(customer_name)s") % {
                'type': _('Reservation'),
                'customer_name': reservation.user.get_full_name() if reservation.user else _('Guest')
            }
            return title_tpl, body_tpl

        with override('ja'):
            title_ja, body_ja = build_title_body()
        with override('en'):
            title_en, body_en = build_title_body()

        data = {
            'type': 'reservation',
            'reservation_id': str(reservation.id),
            'reservation_code': reservation.reservation_code,
            'status': reservation.status,
            'venue_id': str(reservation.venue.id),
            'party_size': str(reservation.party_size),
            'customer_name': reservation.user.get_full_name() if reservation.user else 'Guest',
            'date': reservation.date.strftime('%Y-%m-%d'),
            'time': reservation.start_time.strftime('%H:%M')
        }

        click_action = f"{FRONTEND_URL}/venue/reservations/{reservation.id}"

        success = False
        for manager in venue_managers:
            result = self.send_notification_to_user(
                user=manager,
                title=title_ja,
                body=body_ja,
                title_en=title_en,
                message_en=body_en,
                data=data,
                click_action=click_action,
                save_to_db=True  # Always save venue notifications to database
            )
            if result:
                success = True

        return success

    
    def send_time_slot_available_to_users(self, time_slot):
        logger.info(f"Sending time slot available notification to users for venue {time_slot.venue.id}")
        if not time_slot.venue:
            return
        
        venue_name_ja = MultilingualVenueFieldService.get_venue_name(time_slot.venue, request=None)
        venue_name_en = time_slot.venue.name_en or time_slot.venue.name if time_slot.venue else ''

        # Build both languages for the title
        with override('ja'):
            title_ja = _("%(venue_name)s has resumed accepting orders!") % {'venue_name': venue_name_ja}
        with override('en'):
            title_en = _("%(venue_name)s has resumed accepting orders!") % {'venue_name': venue_name_en}

        from omochi.venues.models import StockedVenue
        
        # Get current Japanese date range
        start_of_day_utc, end_of_day_utc = get_day_utc_range('Asia/Tokyo')
        
        # Get users who have already received notifications from this venue today
        users_with_notifications_today = Notification.objects.filter(
            type='TIME_SLOT_AVAILABLE',
            reference_id=str(time_slot.venue.id),
            reference_type='venue',
            created_at__range=(start_of_day_utc, end_of_day_utc)
        ).values_list('user_id', flat=True)
        
        # Get stocked venues excluding users who already received notifications today
        stocked_venues = StockedVenue.objects.filter(
            venue=time_slot.venue
        ).exclude(
            user_id__in=users_with_notifications_today
        ).select_related('user')

        data = {
            'type': 'time_slot_available',
            'venue_id': str(time_slot.venue.id),
        }

        click_action = f"{FRONTEND_URL}/store/{time_slot.venue.id}"
        
        # Don't pass image_url to _save_notification_to_db anymore
        # The image will be fetched dynamically when displaying notifications

        for stocked_venue in stocked_venues:
            user = stocked_venue.user
            # pass empty body strings (or create localized bodies if you want)
            self.send_notification_to_user(
                user=user,
                title=title_ja,
                body='',
                title_en=title_en,
                message_en='',
                data=data,
                click_action=click_action,
                save_to_db=True,
            )

    
    def _get_venue_managers(self, venue):
        """
        Get all managers/staff for a venue from the venue_manager table
        """
        from omochi.venues.models import VenueManager
        
        # Get all user objects associated with this venue through VenueManager
        venue_managers = VenueManager.objects.filter(venue=venue)
        
        # Extract user objects from the VenueManager queryset
        managers = [manager.user for manager in venue_managers]
        
        return managers


    def create_in_app_notification(
        self,
        user,
        title: str,
        body: str,
        notification_type: str = 'SYSTEM',
        reference_id: str = None,
        reference_type: str = None,
        click_action: Optional[str] = None
    ):
        """
        Create a notification in the database without sending FCM push notification
        Useful for in-app notifications that don't need immediate push notification
        """
        from omochi.notifications.models import Notification
        
        try:
            # Create notification record WITHOUT image_url
            # The image will be fetched dynamically when displaying notifications
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=body,
                type=notification_type,
                reference_id=reference_id,
                reference_type=reference_type,
                click_action=click_action,
                status='UNREAD'
            )
            
            logger.info(f"In-app notification created with ID: {notification.id}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating in-app notification: {str(e)}")
            return None

    def subscribe_to_topic_batch(self, tokens: List[str], topic: str) -> Dict:
        """
        Subscribe multiple FCM tokens to a topic (batch operation)
        Firebase allows max 1000 tokens per batch, we use 500 for safety
        
        Args:
            tokens: List of FCM registration tokens (max 1000, recommend 500)
            topic: Topic name to subscribe to
            
        Returns:
            Dict with success_count and failure_count
        """
        if not self.is_configured():
            logger.error("Firebase is not configured")
            return {'success_count': 0, 'failure_count': len(tokens)}
        
        if not tokens:
            return {'success_count': 0, 'failure_count': 0}
        
        try:
            # Subscribe tokens to topic
            response = messaging.subscribe_to_topic(tokens, topic)
            
            logger.info(f"Topic subscription result: {response.success_count}/{len(tokens)} successful for topic '{topic}'")
            
            # Handle failed subscriptions
            if response.failure_count > 0:
                failed_tokens = []
                for idx, error in enumerate(response.errors):
                    if error:
                        failed_tokens.append(tokens[idx])
                        logger.error(f"Failed to subscribe token {tokens[idx][:20]}... to topic '{topic}': {error.reason}")
                
                # Deactivate invalid tokens
                self._handle_invalid_tokens(failed_tokens)
            
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Error subscribing to topic '{topic}': {str(e)}")
            return {'success_count': 0, 'failure_count': len(tokens)}
    
    def unsubscribe_from_topic_batch(self, tokens: List[str], topic: str) -> Dict:
        """
        Unsubscribe multiple FCM tokens from a topic (batch operation)
        
        Args:
            tokens: List of FCM registration tokens (max 1000, recommend 500)
            topic: Topic name to unsubscribe from
            
        Returns:
            Dict with success_count and failure_count
        """
        if not self.is_configured():
            logger.error("Firebase is not configured")
            return {'success_count': 0, 'failure_count': len(tokens)}
        
        if not tokens:
            return {'success_count': 0, 'failure_count': 0}
        
        try:
            # Unsubscribe tokens from topic
            response = messaging.unsubscribe_from_topic(tokens, topic)
            
            logger.info(f"Topic unsubscription result: {response.success_count}/{len(tokens)} successful for topic '{topic}'")
            
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Error unsubscribing from topic '{topic}': {str(e)}")
            return {'success_count': 0, 'failure_count': len(tokens)}
    
    def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        click_action: Optional[str] = None
    ) -> bool:
        """
        Send notification to all users subscribed to a topic (single API call)
        This is much more efficient than sending to individual users
        
        Args:
            topic: Topic name to send to
            title: Notification title
            body: Notification body
            data: Additional data payload
            click_action: URL to open when notification is clicked
            
        Returns:
            bool: True if notification was sent successfully
        """
        if not self.is_configured():
            logger.error("Firebase is not configured")
            return False
        
        try:
            # Prepare notification data
            notification_data = data or {}
            
            if click_action:
                notification_data['clickAction'] = click_action
            
            # Prepare web push config with click action (only for HTTPS URLs)
            webpush_config = None
            if click_action and click_action.startswith('https://'):
                webpush_config = messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(
                        link=click_action
                    )
                )
            elif click_action and not click_action.startswith('https://'):
                logger.warning(f"Click action URL is not HTTPS, skipping webpush config: {click_action}")
            
            # Create message for topic
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data={k: str(v) for k, v in notification_data.items()},
                topic=topic,
                webpush=webpush_config
            )
            
            # Send the message
            response = messaging.send(message)
            logger.info(f"Successfully sent message to topic '{topic}': {response}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending notification to topic '{topic}': {str(e)}")
            return False


# Global instance
firebase_service = FirebaseNotificationService()
