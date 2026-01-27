from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import logging

logger = logging.getLogger(__name__)

class CustomS3Boto3Storage(S3Boto3Storage):
    """
    Base storage class that supports custom S3 endpoints (like LocalStack)
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Use custom endpoint URL if specified in settings and not empty
        if hasattr(settings, 'AWS_S3_ENDPOINT_URL') and settings.AWS_S3_ENDPOINT_URL and settings.AWS_S3_ENDPOINT_URL.strip():
            self.connection.meta.client.meta.endpoint_url = settings.AWS_S3_ENDPOINT_URL
            logger.info(f"Using custom S3 endpoint: {settings.AWS_S3_ENDPOINT_URL}")
        else:
            logger.info("Using default AWS S3 endpoint")


class StaticStorage(CustomS3Boto3Storage):
    """
    Storage class for static files in S3
    """
    location = settings.STATIC_LOCATION
    default_acl = 'public-read'


class MediaStorage(CustomS3Boto3Storage):
    """
    Storage class for media files in S3
    """
    location = settings.MEDIA_LOCATION
    default_acl = 'public-read'
    file_overwrite = False