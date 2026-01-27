import logging
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from drf_spectacular.utils import extend_schema, OpenApiResponse

from omochi.venues.models import Venue, VenueManager
from omochi.payments.services import StripeConnectService
from omochi.venues.api.serializers import VenueStripeConnectSerializer

logger = logging.getLogger(__name__)


class VenueStripeConnectView(APIView):
    """
    Handle Stripe Connect account operations for venues
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def check_venue_permission(self, request, venue_id):
        """Check if user has permission to manage the venue"""
        venue = get_object_or_404(Venue, id=venue_id)
        
        # Check if user is venue manager with OWNER or MANAGER role
        try:
            manager = VenueManager.objects.get(user=request.user, venue=venue)
            if manager.role not in ['OWNER', 'MANAGER']:
                raise Http404
        except VenueManager.DoesNotExist:
            # User is not a manager
            raise Http404
            
        return venue
    
    @extend_schema(
        summary="Get Stripe Connect account status",
        description="Get the status of a venue's Stripe Connect account",
        responses={
            200: OpenApiResponse(
                response=VenueStripeConnectSerializer,
                description="Stripe Connect account status retrieved successfully"
            ),
            404: OpenApiResponse(description="Venue not found or user doesn't have permission"),
        }
    )
    def get(self, request, venue_id):
        """Get Stripe Connect account status"""
        venue = self.check_venue_permission(request, venue_id)
        
        # Refresh account info from Stripe if account exists
        if venue.stripe_account_id:
            try:
                StripeConnectService.retrieve_account(venue)
            except Exception as e:
                logger.error(f"Error retrieving Stripe account: {str(e)}")
        
        serializer = VenueStripeConnectSerializer(venue)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Create Stripe Connect account",
        description="Create a new Stripe Connect account for a venue",
        responses={
            200: OpenApiResponse(
                description="Account created successfully",
                response={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "account_id": {"type": "string"},
                        "message": {"type": "string"}
                    }
                }
            ),
            400: OpenApiResponse(description="Error creating account"),
            404: OpenApiResponse(description="Venue not found or user doesn't have permission"),
        }
    )
    def post(self, request, venue_id):
        """Create a new Stripe Connect account"""
        venue = self.check_venue_permission(request, venue_id)
        
        # Check if venue already has an account
        if venue.stripe_account_id:
            return Response(
                {
                    "success": False,
                    "message": "This venue already has a Stripe Connect account."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create a new Stripe Connect account
            account = StripeConnectService.create_account(venue)
            
            return Response({
                "success": True,
                "account_id": account.id,
                "message": "Stripe Connect account created successfully."
            })
            
        except Exception as e:
            logger.error(f"Error creating Stripe Connect account: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error creating Stripe Connect account: {str(e)}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class StripeConnectOnboardingLinkView(APIView):
    """
    Generate onboarding link for Stripe Connect
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def check_venue_permission(self, request, venue_id):
        """Check if user has permission to manage the venue"""
        venue = get_object_or_404(Venue, id=venue_id)
        
        # Check if user is venue manager with OWNER or MANAGER role
        try:
            manager = VenueManager.objects.get(user=request.user, venue=venue)
            if manager.role not in ['OWNER', 'MANAGER']:
                raise Http404
        except VenueManager.DoesNotExist:
            # User is not a manager
            raise Http404
            
        return venue
    
    @extend_schema(
        summary="Create onboarding link",
        description="Create a Stripe Connect onboarding link for a venue",
        responses={
            200: OpenApiResponse(
                description="Onboarding link created successfully",
                response={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "format": "uri"},
                        "expires_at": {"type": "integer"}
                    }
                }
            ),
            400: OpenApiResponse(description="Error creating onboarding link"),
            404: OpenApiResponse(description="Venue not found or user doesn't have permission"),
        }
    )
    def post(self, request, venue_id):
        """Create a Stripe Connect onboarding link"""
        venue = self.check_venue_permission(request, venue_id)
        
        try:
            # Create an account link for onboarding
            account_link = StripeConnectService.create_account_link(venue)
            
            return Response({
                "url": account_link.url,
                "expires_at": account_link.expires_at
            })
            
        except Exception as e:
            logger.error(f"Error creating Stripe Connect onboarding link: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error creating onboarding link: {str(e)}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
