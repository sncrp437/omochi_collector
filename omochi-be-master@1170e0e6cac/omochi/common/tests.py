"""
Tests for common utility functions
"""
import os
from unittest.mock import Mock, patch
from django.test import TestCase, RequestFactory
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from omochi.common.utils import (
    build_absolute_url,
    build_absolute_image_url,
    _join_urls,
    get_media_url_for_storage,
    is_s3_storage,
    AbsoluteURLMixin
)
from omochi.venues.models import Venue


class URLUtilsTestCase(TestCase):
    """Test cases for URL utility functions"""
    
    def setUp(self):
        """Set up test data"""
        self.factory = RequestFactory()
        self.request = self.factory.get('/')
        self.request.META['HTTP_HOST'] = 'testserver'
        
        # Create a test venue with logo
        self.venue = Venue.objects.create(
            name="Test Venue",
            address="123 Test St"
        )
        
        # Create a mock image file
        self.test_image = SimpleUploadedFile(
            name='test_logo.jpg',
            content=b'test image content',
            content_type='image/jpeg'
        )
    
    def test_join_urls(self):
        """Test URL joining utility"""
        # Test various combinations of slashes
        self.assertEqual(_join_urls('http://example.com', 'path/to/file'), 'http://example.com/path/to/file')
        self.assertEqual(_join_urls('http://example.com/', 'path/to/file'), 'http://example.com/path/to/file')
        self.assertEqual(_join_urls('http://example.com', '/path/to/file'), 'http://example.com/path/to/file')
        self.assertEqual(_join_urls('http://example.com/', '/path/to/file'), 'http://example.com/path/to/file')
    
    def test_build_absolute_url_with_none(self):
        """Test building URL with None file field"""
        result = build_absolute_url(None)
        self.assertIsNone(result)
    
    def test_build_absolute_url_with_empty_file(self):
        """Test building URL with empty file field"""
        result = build_absolute_url(self.venue.logo)  # Empty logo field
        self.assertIsNone(result)
    
    @patch('django.core.files.storage.default_storage.url')
    def test_build_absolute_url_with_absolute_s3_url(self, mock_url):
        """Test building URL when file field already returns absolute URL (S3)"""
        # Mock S3 URL
        mock_url.return_value = 'https://mybucket.s3.amazonaws.com/venue_logos/test.jpg'
        
        # Mock the logo field to have a URL
        mock_logo = Mock()
        mock_logo.url = 'https://mybucket.s3.amazonaws.com/venue_logos/test.jpg'
        
        result = build_absolute_url(mock_logo)
        self.assertEqual(result, 'https://mybucket.s3.amazonaws.com/venue_logos/test.jpg')
    
    def test_build_absolute_url_with_request(self):
        """Test building URL with request object"""
        mock_logo = Mock()
        mock_logo.url = '/media/venue_logos/test.jpg'
        
        result = build_absolute_url(mock_logo, self.request)
        self.assertEqual(result, 'http://testserver/media/venue_logos/test.jpg')
    
    @patch('omochi.common.utils.settings')
    def test_build_absolute_url_with_media_url_setting(self, mock_settings):
        """Test building URL using MEDIA_URL setting"""
        mock_settings.MEDIA_URL = 'https://cdn.example.com/media/'
        
        mock_logo = Mock()
        mock_logo.url = '/media/venue_logos/test.jpg'
        
        result = build_absolute_url(mock_logo)
        self.assertEqual(result, 'https://cdn.example.com/media/media/venue_logos/test.jpg')
    
    @patch('omochi.common.utils.settings')
    def test_build_absolute_url_with_site_url_fallback(self, mock_settings):
        """Test building URL using SITE_URL fallback"""
        mock_settings.MEDIA_URL = '/media/'
        mock_settings.SITE_URL = 'https://mysite.com'
        
        mock_logo = Mock()
        mock_logo.url = '/media/venue_logos/test.jpg'
        
        result = build_absolute_url(mock_logo)
        self.assertEqual(result, 'https://mysite.com/media/venue_logos/test.jpg')
    
    def test_build_absolute_image_url_alias(self):
        """Test that build_absolute_image_url is an alias for build_absolute_url"""
        mock_logo = Mock()
        mock_logo.url = 'https://example.com/test.jpg'
        
        result1 = build_absolute_url(mock_logo, self.request)
        result2 = build_absolute_image_url(mock_logo, self.request)
        
        self.assertEqual(result1, result2)
    
    def test_get_media_url_for_storage(self):
        """Test getting media URL from settings"""
        media_url = get_media_url_for_storage()
        self.assertIsInstance(media_url, str)
    
    def test_is_s3_storage(self):
        """Test S3 storage detection"""
        # This will depend on your current storage backend
        result = is_s3_storage()
        self.assertIsInstance(result, bool)


class AbsoluteURLMixinTestCase(TestCase):
    """Test cases for AbsoluteURLMixin"""
    
    def setUp(self):
        """Set up test data"""
        self.factory = RequestFactory()
        self.request = self.factory.get('/')
        self.request.META['HTTP_HOST'] = 'testserver'
        
        # Create a test venue (which should inherit from AbsoluteURLMixin)
        self.venue = Venue.objects.create(
            name="Test Venue",
            address="123 Test St"
        )
    
    def test_get_absolute_url_with_nonexistent_field(self):
        """Test getting absolute URL for non-existent field"""
        result = self.venue.get_absolute_url('nonexistent_field')
        self.assertIsNone(result)
    
    def test_get_absolute_image_url_method_exists(self):
        """Test that get_absolute_image_url method exists"""
        self.assertTrue(hasattr(self.venue, 'get_absolute_image_url'))
        
        # Test with non-existent field
        result = self.venue.get_absolute_image_url('nonexistent_field')
        self.assertIsNone(result)


class IntegrationTestCase(TestCase):
    """Integration tests for URL utilities with real Django models"""
    
    def setUp(self):
        """Set up test data"""
        self.venue = Venue.objects.create(
            name="Integration Test Venue",
            address="456 Integration St"
        )
    
    def test_venue_logo_absolute_url_methods(self):
        """Test that Venue model can use absolute URL methods"""
        # Test with empty logo
        self.assertIsNone(self.venue.get_absolute_image_url('logo'))
        
        # Note: Testing with actual file upload would require more complex setup
        # This tests the method existence and basic functionality
        self.assertTrue(callable(self.venue.get_absolute_url))
        self.assertTrue(callable(self.venue.get_absolute_image_url))
