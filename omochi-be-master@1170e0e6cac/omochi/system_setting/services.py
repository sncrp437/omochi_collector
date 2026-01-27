from typing import Optional, Dict, Any, List
from django.core.cache import cache
from .models import SystemSetting


class SystemSettingService:
    """
    Service class for managing system settings with caching support
    """
    
    CACHE_TTL = 3600  # Cache for 1 hour
    
    @classmethod
    def get_setting(cls, key: str) -> Optional[SystemSetting]:
        """
        Get a system setting by key with caching
        
        Args:
            key (str): The setting key
            
        Returns:
            SystemSetting or None: The setting object if found
        """
        cache_key = f"system_setting_{key}"
        setting = cache.get(cache_key)
        
        if setting is None:
            setting = SystemSetting.objects.filter(key=key).first()
            if setting:
                cache.set(cache_key, setting, cls.CACHE_TTL)
        
        return setting
    
    @classmethod
    def get_setting_value(cls, key: str, default: Any = None) -> Any:
        """
        Get a system setting value by key
        
        Args:
            key (str): The setting key
            default (Any): Default value if setting not found
            
        Returns:
            Any: The setting value or default
        """
        setting = cls.get_setting(key)
        return setting.value if setting else default
    
    @classmethod
    def get_service_fee_settings(cls) -> Dict[str, Any]:
        """
        Get service fee settings with default values
        
        Returns:
            Dict[str, Any]: Service fee configuration
        """
        default_settings = {
            'base_fee_amount': 120,
            'tax_rate': 0.10,  # Default tax rate
        }
        
        setting = cls.get_setting('service fee')
        if setting and isinstance(setting.value, dict):
            return {**default_settings, **setting.value}
        
        return default_settings
    
    @classmethod
    def get_application_fee_amount(cls) -> int:
        """
        Get the application fee amount for the platform
        
        Returns:
            int: Application fee amount in JPY
        """
        service_fee_settings = cls.get_service_fee_settings()
        return round(service_fee_settings.get('base_fee_amount'))
    
    @classmethod
    def get_application_fee_tax_rate(cls) -> float:
        """
        Get the tax rate for service fees
        
        Returns:
            float: Tax rate as a decimal
        """
        service_fee_settings = cls.get_service_fee_settings()
        return float(service_fee_settings.get('tax_rate', 0.10))
    
    @classmethod
    def invalidate_cache(cls, key: str) -> None:
        """
        Invalidate cache for a specific setting key
        
        Args:
            key (str): The setting key to invalidate
        """
        cache_key = f"system_setting_{key}"
        cache.delete(cache_key)
    
    @classmethod
    def invalidate_all_cache(cls) -> None:
        """
        Invalidate all system setting caches
        """
        # This would require a more sophisticated cache key pattern
        # For now, we'll just clear the service fee cache
        cls.invalidate_cache('service fee')
    
    @classmethod
    def get_referral_onboarding_coupon_ids(cls) -> List[str]:
        """
        Get the list of coupon IDs for referral onboarding
        
        Returns:
            List[str]: List of coupon IDs for referral onboarding
        """
        default_coupon_ids = []
        
        setting = cls.get_setting('referral_onboarding_coupon')
        if setting and isinstance(setting.value, list):
            return setting.value
        
        return default_coupon_ids
