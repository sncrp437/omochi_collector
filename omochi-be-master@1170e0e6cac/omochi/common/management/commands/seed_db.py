import json
import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings

from omochi.coupons.models import Coupon
from omochi.system_setting.models import SystemSetting
from omochi.areas.models import Area
from omochi.menus.models import MenuCategory
from omochi.users.models import FCMToken
from omochi.notifications.services import FirebaseNotificationService


User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial data for development or testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Flush existing data before seeding',
        )
        parser.add_argument(
            '--force-topic-subscription',
            action='store_true',
            help='Force re-subscribe all users to Firebase topic (even if already done)',
        )

    def handle(self, *args, **options):
        # Get current directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        seed_data_dir = os.path.join(base_dir, 'seed_data')
        
        # Check if seed_data directory exists
        if not os.path.exists(seed_data_dir):
            self.stdout.write(self.style.ERROR(f"Seed data directory not found at {seed_data_dir}"))
            self.stdout.write(self.style.ERROR("Seeding operation aborted. Please make sure seed data exists before running this command."))
            return
        
        # Check if we need to flush existing data
        if options['flush']:
            self.stdout.write(self.style.WARNING("Flushing existing data..."))
            
            # Delete data in reverse order of dependencies
            Coupon.objects.all().delete()
            SystemSetting.objects.all().delete()
            # Don't delete users as they might be needed for other things
            
            self.stdout.write(self.style.SUCCESS("Existing data flushed successfully"))
        
        # Define seed data files
        users_file = os.path.join(seed_data_dir, 'users.json')
        coupons_file = os.path.join(seed_data_dir, 'coupons.json')
        system_settings_file = os.path.join(seed_data_dir, 'system_settings.json')
        
        # Initialize data variables
        users_data = []
        coupons_data = []
        system_settings_data = []
        
        # Load seed data files if they exist
        try:
            # Load users data if file exists
            if os.path.exists(users_file):
                with open(users_file, 'r') as f:
                    users_data = json.load(f)
            else:
                self.stdout.write(self.style.WARNING(f"Users seed data not found at {users_file}"))
            
            # Load coupons data if file exists
            if os.path.exists(coupons_file):
                with open(coupons_file, 'r') as f:
                    coupons_data = json.load(f)
            else:
                self.stdout.write(self.style.WARNING(f"Coupons seed data not found at {coupons_file}"))
            
            # Load system settings data if file exists
            if os.path.exists(system_settings_file):
                with open(system_settings_file, 'r') as f:
                    system_settings_data = json.load(f)
            else:
                self.stdout.write(self.style.WARNING(f"System settings seed data not found at {system_settings_file}"))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Error parsing seed data: {str(e)}"))
            return
        
        # Seed users
        users = []
        if users_data:
            self.stdout.write(self.style.NOTICE("Seeding users..."))
            for user_data in users_data:
                email = user_data['email']
                # Create user only if it doesn't exist
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'id': user_data.get('id'),
                        'first_name': user_data['first_name'],
                        'last_name': user_data['last_name'],
                        'phone_number': user_data.get('phone_number'),
                        'is_staff': user_data.get('is_staff', False),
                        'is_superuser': user_data.get('is_superuser', False),
                        'password': user_data['password'],  # This will be hashed later
                    }
                )
                # Set password only if user is newly created
                if created:
                    user.set_password(user_data['password'])
                    user.save()
                
                users.append(user)
                action = "Skipped" if not created else "Created"
                self.stdout.write(self.style.SUCCESS(f"{action} user: {email}"))
        else:
            self.stdout.write(self.style.WARNING("Skipping users seeding - no data found"))
            # Make sure there's at least one user in the database to avoid index errors later
            if User.objects.exists():
                users = list(User.objects.all())
            
        # Seed coupons
        if coupons_data:
            self.stdout.write(self.style.NOTICE("Seeding coupons..."))
            for coupon_data in coupons_data:
                
                # Create coupon only if it doesn't exist
                coupon, created = Coupon.objects.get_or_create(
                    id=coupon_data['id'],
                    defaults={
                        'id': coupon_data['id'],
                        'type': coupon_data['type'],
                        'amount': coupon_data['amount'],
                        'value_type': coupon_data['value_type'],
                        'order_type': coupon_data['order_type'],
                        'payment_method': coupon_data['payment_method'],
                        'expiry_date': coupon_data.get('expiry_date', None),
                        'is_active': coupon_data.get('is_active', True),
                        'description': coupon_data.get('description', ''),
                        'paid_by': coupon_data.get('paid_by', 'VENUE'),
                    }
                )
                
                action = "Skipped" if not created else "Created"
                self.stdout.write(self.style.SUCCESS(
                    f"{action} coupon: {coupon_data['type']} - {coupon_data['amount']}"
                ))
        else:
            self.stdout.write(self.style.WARNING("Skipping coupons seeding - no data found"))
        
        # Seed system settings
        if system_settings_data:
            self.stdout.write(self.style.NOTICE("Seeding system settings..."))
            for setting_data in system_settings_data:
                key = setting_data['key']
                # Create or update system setting
                setting, created = SystemSetting.objects.get_or_create(
                    key=key,
                    defaults={
                        'value': setting_data['value'],
                    }
                )
                
                action = "Skipped" if not created else "Created"
                self.stdout.write(self.style.SUCCESS(f"{action} system setting: {key}"))
        else:
            self.stdout.write(self.style.WARNING("Skipping system settings seeding - no data found"))
        
        # Multilingual Area seeding (single file)
        areas_multi_path = os.path.join(os.path.dirname(__file__), '../../../seed_data/areas_multilingual.json')
        multi_data = []
        if os.path.exists(areas_multi_path):
            with open(areas_multi_path, encoding='utf-8') as f:
                multi_data = json.load(f)

        # Build mapping {(jp_pref, jp_station): (en_pref, en_station)}
        multi_map = {}
        for area in multi_data:
            jp_pref = area['prefecture']
            en_pref = area.get('prefecture_en', '')
            for station in area['stations']:
                jp_station = station['jp']
                en_station = station.get('en', '')
                multi_map[(jp_pref, jp_station)] = (en_pref, en_station)

        # Build set of existing area keys
        existing_keys = set(Area.objects.values_list('prefecture', 'station'))

        # Update only English fields for existing Areas if JP+EN match found
        for area_obj in Area.objects.all():
            key = (area_obj.prefecture, area_obj.station)
            if key in multi_map:
                en_pref, en_station = multi_map[key]
                updated = False
                if en_pref and area_obj.prefecture_en != en_pref:
                    area_obj.prefecture_en = en_pref
                    updated = True
                if en_station and area_obj.station_en != en_station:
                    area_obj.station_en = en_station
                    updated = True
                if updated:
                    area_obj.save()

        # Create new Areas if not exist
        for area in multi_data:
            jp_pref = area['prefecture']
            en_pref = area.get('prefecture_en', '')
            for station in area['stations']:
                jp_station = station['jp']
                en_station = station.get('en', '')
                key = (jp_pref, jp_station)
                if key not in existing_keys:
                    Area.objects.create(
                        prefecture=jp_pref,
                        prefecture_en=en_pref,
                        station=jp_station,
                        station_en=en_station
                    )
                    existing_keys.add(key)
        self.stdout.write(self.style.SUCCESS('Seeded multilingual areas'))
        
        # Seed menu categories
        categories_file = os.path.join(seed_data_dir, 'categories.json')
        categories_data = []
        if os.path.exists(categories_file):
            with open(categories_file, 'r', encoding='utf-8') as f:
                categories_data = json.load(f)

                self.stdout.write(self.style.NOTICE("Seeding menu categories..."))
                for category_data in categories_data:
                    menu_category, created = MenuCategory.objects.get_or_create(
                        id=category_data['id'],
                        defaults={
                            'name': category_data['name'],
                            'venue': None,
                            'description': category_data.get('description', ''),
                            'display_order': category_data.get('display_order', 0),
                        }
                    )
                    action = "Skipped" if not created else "Created"
                    self.stdout.write(self.style.SUCCESS(f"{action} menu category: {category_data['name']}"))
        else:
            self.stdout.write(self.style.WARNING("Skipping menu categories seeding - no data found"))
        
        # Seed multilingual menu categories
        menu_categories_multi_path = os.path.join(os.path.dirname(__file__), '../../../seed_data/menu_categories_multilingual.json')
        menu_multi_data = []
        if os.path.exists(menu_categories_multi_path):
            with open(menu_categories_multi_path, encoding='utf-8') as f:
                menu_multi_data = json.load(f)

        # Build mapping {name: name_en}
        menu_multi_map = {}
        for category in menu_multi_data:
            name = category.get('name')
            name_en = category.get('name_en', '')
            if name:
                menu_multi_map[name] = name_en

        # Update only English name for existing MenuCategory if name match found
        updated_count = 0
        for menu_obj in MenuCategory.objects.all():
            if menu_obj.name in menu_multi_map:
                name_en = menu_multi_map[menu_obj.name]
                if name_en and getattr(menu_obj, 'name_en', None) != name_en:
                    menu_obj.name_en = name_en
                    menu_obj.save()
                    updated_count += 1
        if updated_count:
            self.stdout.write(self.style.SUCCESS(f'Seeded multilingual menu categories: {updated_count} updated'))
        else:
            self.stdout.write(self.style.WARNING('No multilingual menu categories updated'))
        
        # Subscribe existing users to Firebase topic (auto-detect if needed)
        self._subscribe_users_to_topic_if_needed(options.get('force_topic_subscription', False))
        
        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
    
    def _subscribe_users_to_topic_if_needed(self, force=False):
        """
        Subscribe eligible users' FCM tokens to Firebase broadcast topic.
        Auto-detects if subscription is needed by checking SystemSetting.
        Only runs once unless forced.
        """
        # Check if subscription has already been done
        subscription_done_key = 'firebase_topic_subscription_completed'
        subscription_done = SystemSetting.objects.filter(
            key=subscription_done_key,
            value='true'
        ).exists()
        
        if subscription_done and not force:
            self.stdout.write(self.style.NOTICE(
                'Firebase topic subscription already completed. '
                'Use --force-topic-subscription to run again.'
            ))
            return
        
        self.stdout.write(self.style.NOTICE("\n" + "="*80))
        self.stdout.write(self.style.NOTICE("Subscribing users to Firebase language-specific topics..."))
        self.stdout.write(self.style.NOTICE("="*80))
        
        # Get language-specific topics
        topic_ja = getattr(settings, 'FIREBASE_TOPIC_JA', 'all-users-ja')
        topic_en = getattr(settings, 'FIREBASE_TOPIC_EN', 'all-users-en')
        
        # Get all eligible tokens grouped by user language
        eligible_tokens = FCMToken.objects.filter(
            is_active=True,
            user__is_active=True,
            user__managed_venues__isnull=True
        ).select_related('user').distinct()
        
        # Group tokens by language
        ja_tokens = []
        en_tokens = []
        all_tokens_list = []
        
        for fcm_token in eligible_tokens:
            token = fcm_token.token
            all_tokens_list.append(token)
            user_lang = fcm_token.user.preferred_language
            
            if user_lang.startswith('ja'):
                ja_tokens.append(token)
            else:  # Default to English for any other language
                en_tokens.append(token)
        
        total_tokens = len(all_tokens_list)
        
        if total_tokens == 0:
            self.stdout.write(self.style.WARNING('No eligible users with FCM tokens found. Skipping.'))
            # Mark as done to avoid repeated checks
            SystemSetting.objects.update_or_create(
                key='firebase_topic_subscription_completed',
                defaults={'value': 'true'}
            )
            return
        
        # Count unique users for reporting
        total_users = eligible_tokens.values_list('user_id', flat=True).distinct().count()
        
        self.stdout.write(f'Found {total_users} eligible users with {total_tokens} active tokens')
        self.stdout.write(f'  - Japanese users: {len(ja_tokens)} tokens')
        self.stdout.write(f'  - English users: {len(en_tokens)} tokens')
        
        # Check Firebase configuration
        firebase_service = FirebaseNotificationService()
        if not firebase_service.is_configured():
            self.stdout.write(self.style.WARNING(
                'Firebase is not configured. Skipping topic subscription.\n'
                'Users will be auto-subscribed when they register new FCM tokens.'
            ))
            # Still mark as done to avoid repeated attempts
            SystemSetting.objects.update_or_create(
                key='firebase_topic_subscription_completed',
                defaults={'value': 'true'}
            )
            return
        
        batch_size = 500
        
        # Step 1: Subscribe Japanese tokens to topic_ja
        ja_success = 0
        ja_failure = 0
        
        if ja_tokens:
            self.stdout.write(self.style.NOTICE(f'\n1. Subscribing {len(ja_tokens)} Japanese users to "{topic_ja}"...'))
            
            for i in range(0, len(ja_tokens), batch_size):
                batch = ja_tokens[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (len(ja_tokens) + batch_size - 1) // batch_size
                
                try:
                    result = firebase_service.subscribe_to_topic_batch(batch, topic_ja)
                    ja_success += result['success_count']
                    ja_failure += result['failure_count']
                    
                    self.stdout.write(
                        f'  Batch {batch_num}/{total_batches}: '
                        f'{result["success_count"]} success, {result["failure_count"]} failed'
                    )
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  Batch {batch_num} error: {str(e)}'))
                    ja_failure += len(batch)
            
            self.stdout.write(self.style.SUCCESS(f'Subscribed {ja_success}/{len(ja_tokens)} Japanese tokens'))
        
        # Step 2: Subscribe English tokens to topic_en
        en_success = 0
        en_failure = 0
        
        if en_tokens:
            self.stdout.write(self.style.NOTICE(f'\n2. Subscribing {len(en_tokens)} English users to "{topic_en}"...'))
            
            for i in range(0, len(en_tokens), batch_size):
                batch = en_tokens[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (len(en_tokens) + batch_size - 1) // batch_size
                
                try:
                    result = firebase_service.subscribe_to_topic_batch(batch, topic_en)
                    en_success += result['success_count']
                    en_failure += result['failure_count']
                    
                    self.stdout.write(
                        f'  Batch {batch_num}/{total_batches}: '
                        f'{result["success_count"]} success, {result["failure_count"]} failed'
                    )
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  Batch {batch_num} error: {str(e)}'))
                    en_failure += len(batch)
            
            self.stdout.write(self.style.SUCCESS(f'Subscribed {en_success}/{len(en_tokens)} English tokens'))
        
        # Summary
        total_success = ja_success + en_success
        total_failure = ja_failure + en_failure
        
        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*80}\n'
            f'Language-specific topic subscription complete:\n'
            f'  Total: {total_success}/{total_tokens} tokens subscribed\n'
            f'  Japanese: {ja_success}/{len(ja_tokens)}\n'
            f'  English: {en_success}/{len(en_tokens)}\n'
            f'{"="*80}'
        ))
        
        if total_failure > 0:
            self.stdout.write(self.style.WARNING(f'Failed: {total_failure} tokens'))
        
        # Mark subscription as completed
        SystemSetting.objects.update_or_create(
            key='firebase_topic_subscription_completed',
            defaults={'value': 'true'}
        )
        self.stdout.write(self.style.SUCCESS('Subscription status saved.'))
