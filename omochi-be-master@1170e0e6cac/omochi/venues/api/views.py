from django.utils.translation import gettext_lazy as _
from omochi.common.multilingual_service import MULTILINGUAL_ENUM
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from omochi.reservations.models import TimeSlot
from omochi.venues.models import Venue, VenueManager, VenueQuestion

from .serializers import (
    VenueDetailSerializer, 
    VenueSerializer, 
    VenueQuestionSerializer, 
    VenueQuestionsConfigSerializer,
    VenueQuestionsUpdateSerializer
)
class IsVenueManagerOrAdmin(permissions.BasePermission):
    """Permission to only allow venue managers or admins to modify venues"""

    def has_permission(self, request, view):
        # Allow read operations for any authenticated or anonymous user
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user is admin
        if request.user.is_staff:
            return True

        # For create operations on nested resources, check venue-level permissions
        venue_id = view.kwargs.get('venue_id')
        if venue_id and request.method == 'POST':
            try:
                venue = Venue.objects.get(id=venue_id)
                return VenueManager.objects.filter(
                    user=request.user,
                    venue=venue,
                    role__in=['OWNER', 'MANAGER'],
                ).exists()
            except Venue.DoesNotExist:
                return False

        return (
            True  # Let has_object_permission handle object-level permissions
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if user is admin
        if request.user.is_staff:
            return True

        # Get the venue object based on the type of obj
        venue = None
        if hasattr(obj, 'venue'):
            # If obj has a venue field (like MenuCategory or MenuItem)
            venue = obj.venue
        elif isinstance(obj, Venue):
            # If obj is already a Venue
            venue = obj
        else:
            # If we can't determine the venue, deny permission
            return False

        # Check if user is owner or manager for this venue
        return VenueManager.objects.filter(
            user=request.user, venue=venue, role__in=['OWNER', 'MANAGER']
        ).exists()


class VenueViewSet(viewsets.ModelViewSet):
    """API endpoints for managing venues"""

    queryset = Venue.objects.all()
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsVenueManagerOrAdmin,
    ]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        nearest_station = self.request.query_params.get('nearest_station')
        genre = self.request.query_params.get('genre')
        
        # Order by created_at in descending order by default
        queryset = queryset.order_by('-created_at')

        if name:
            queryset = queryset.filter(name__icontains=name)
        if nearest_station:
            queryset = queryset.filter(
                nearest_station__icontains=nearest_station
            )
        if genre:
            queryset = queryset.filter(genre=genre)

        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return VenueDetailSerializer
        return VenueSerializer

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save()

    def perform_update(self, serializer):
        if serializer.is_valid():
            new_opening_time = serializer.validated_data.get('opening_time')
            new_closing_time = serializer.validated_data.get('closing_time')

            if new_opening_time and new_closing_time:
                venue = self.get_object()
                timeslots = TimeSlot.objects.filter(venue=venue.id)

                for timeslot in timeslots:
                    if (
                        timeslot.start_time < new_opening_time
                        or timeslot.end_time > new_closing_time
                    ):
                        raise ValidationError(
                            {
                                "detail": _(
                                    "There are time slots set outside these hours. Please remove or adjust those slots before changing your business hours."
                                )
                            }
                        )
            serializer.save()

    @extend_schema(
        summary="List all venues",
        description="Returns a list of all venues with basic information, ordered by creation date (newest first)",
        parameters=[
            OpenApiParameter(
                name='name', description='Filter by venue name', type=str
            ),
            OpenApiParameter(
                name='nearest_station',
                description='Filter by nearest station',
                type=str,
            ),
            OpenApiParameter(
                name='genre', description='Filter by genre', type=str
            ),
            OpenApiParameter(
                name='multilingual',
                description='Enable multilingual translation based on Accept-Language header. Set to "false" to disable and return original data (default: "true")',
                type=str,
                default='true',
                enum=MULTILINGUAL_ENUM
            ),
        ],
        responses={200: OpenApiResponse(response=VenueSerializer(many=True))},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create a new venue",
        description="Create a new venue (admin only). Use multipart/form-data when uploading venue logo or images.",
        request=VenueSerializer,
        responses={
            201: OpenApiResponse(response=VenueSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(
                description="Permission denied, admin access required"
            ),
        },
        methods=["POST"],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Get venue details",
        description="Get detailed information about a venue by ID",
        parameters=[
            OpenApiParameter(
                name='multilingual',
                description='Enable multilingual translation based on Accept-Language header. Set to "false" to disable and return original data (default: "true")',
                type=str,
                default='true',
                enum=MULTILINGUAL_ENUM
            ),
        ],
        responses={
            200: OpenApiResponse(response=VenueDetailSerializer),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update venue",
        description="Update venue information (venue managers or admins only). Use multipart/form-data when uploading venue logo or images.",
        request=VenueSerializer,
        responses={
            200: OpenApiResponse(response=VenueSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Venue not found"),
        },
        methods=["PUT", "PATCH"],
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete venue",
        description="Delete a venue (admin only)",
        responses={
            204: OpenApiResponse(description="Venue deleted successfully"),
            403: OpenApiResponse(
                description="Permission denied, admin access required"
            ),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Get venue menu",
        description="Get the complete menu for a venue, including all categories and items",
        responses={
            200: OpenApiResponse(
                description="Menu data returned successfully"
            ),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    @action(detail=True, methods=['get'])
    def menu(self, request, pk=None):
        # Menu endpoint logic would go here
        return Response({"message": "Menu data for the venue"})


class VenueQuestionsView(APIView):
    """API endpoints for managing venue questions configuration"""
    
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsVenueManagerOrAdmin]
    parser_classes = [JSONParser]
    
    def get_venue(self):
        """Get venue object or return 404"""
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Venue, pk=self.kwargs['venue_id'])
    
    def get_questions_data(self, venue, request=None):
        """Helper method to construct questions response data"""
        questions = venue.questions.all().order_by('ordinal', 'created_at')
        context = {'request': request} if request else {}
        return {
            'enable_order_questions': venue.enable_order_questions,
            'questions': VenueQuestionSerializer(questions, many=True, context=context).data
        }

    @extend_schema(
        summary="Get venue questions configuration",
        description="Get venue order questions configuration including enable flag and questions list",
        parameters=[
            OpenApiParameter(
                name='multilingual',
                description='Enable multilingual translation based on Accept-Language header. Set to "false" to disable and return original data (default: "true")',
                type=str,
                default='true',
                enum=MULTILINGUAL_ENUM
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=VenueQuestionsConfigSerializer,
                description="Questions configuration retrieved successfully"
            ),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def get(self, request, venue_id=None):
        """Get venue questions configuration including enable flag and questions"""
        venue = self.get_venue()
        return Response(self.get_questions_data(venue, request))

    @extend_schema(
        summary="Update venue questions configuration",
        description="Update venue order questions configuration including enable flag and questions list",
        request=VenueQuestionsUpdateSerializer,
        responses={
            200: OpenApiResponse(
                response=VenueQuestionsConfigSerializer,
                description="Questions configuration updated successfully"
            ),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def put(self, request, venue_id=None):
        """Update venue questions configuration"""
        venue = self.get_venue()
        
        # Permission check handled by permission_classes
        self.check_object_permissions(request, venue)
        
        serializer = VenueQuestionsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        self.perform_update(venue, serializer.validated_data)
        return Response(self.get_questions_data(venue, request))
    
    def perform_update(self, venue, validated_data):
        """Perform the actual update logic - separated for clarity"""
        from django.db import transaction
        
        with transaction.atomic():
            # Update enable_order_questions if provided
            if 'enable_order_questions' in validated_data:
                venue.enable_order_questions = validated_data['enable_order_questions']
                venue.save()
            
            # Update questions if provided
            if 'questions' in validated_data:
                # Delete and recreate questions for atomicity
                venue.questions.all().delete()
                
                # Bulk create for better performance
                questions_to_create = [
                    VenueQuestion(venue=venue, **question_data)
                    for question_data in validated_data['questions']
                ]
                VenueQuestion.objects.bulk_create(questions_to_create)


