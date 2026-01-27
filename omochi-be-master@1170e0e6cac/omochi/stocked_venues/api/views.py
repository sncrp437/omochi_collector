from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from omochi.venues.models import StockedVenue
from omochi.reservations.models import TimeSlot
from omochi.common.multilingual_service import MultilingualService, SupportedLanguage

from .serializers import StockedVenueSerializer
from django.utils.translation import gettext_lazy as _


class StockedVenueViewSet(viewsets.ModelViewSet):
    """API endpoints for managing user's stocked venues"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StockedVenueSerializer

    def get_queryset(self):
        queryset = StockedVenue.objects.filter(user=self.request.user).select_related('venue')

        # Filter timeslots based on order types
        order_types = self.request.query_params.get('order_types')
        if order_types:
            queryset = queryset.prefetch_related(
                Prefetch('venue__time_slots', queryset=TimeSlot.objects.filter(service_type=order_types))
            )
        else:
            queryset = queryset.prefetch_related('venue__time_slots')

        queryset = queryset.order_by('-date_added')

        is_favorite = self.request.query_params.get('is_favorite')
        if is_favorite:
            if is_favorite.lower() == 'true':
                queryset = queryset.filter(is_favorite=True)
            elif is_favorite.lower() == 'false':
                queryset = queryset.filter(is_favorite=False)

        genre = self.request.query_params.get('genre')
        if genre:
            # Get current language from request
            current_language = MultilingualService.get_current_language(self.request)
            
            # Filter by appropriate genre field based on language
            if current_language == SupportedLanguage.ENGLISH:
                # Try English field first, fallback to Japanese if empty
                queryset = queryset.filter(
                    Q(venue__genre_en__icontains=genre) |
                    (Q(venue__genre_en__isnull=True) | Q(venue__genre_en='')) & 
                    Q(venue__genre__icontains=genre)
                )
            else:
                # For Japanese, just filter by genre field
                queryset = queryset.filter(venue__genre__icontains=genre)

        nearest_station = self.request.query_params.get('nearest_station')
        if nearest_station:
            # Get current language from request
            current_language = MultilingualService.get_current_language(self.request)
            if current_language == SupportedLanguage.ENGLISH:
                # Try English field first, fallback to Japanese if empty
                queryset = queryset.filter(
                    Q(venue__nearest_station_en__icontains=nearest_station) |
                    (Q(venue__nearest_station_en__isnull=True) | Q(venue__nearest_station_en='')) &
                    Q(venue__nearest_station__icontains=nearest_station)
                )
            else:
                queryset = queryset.filter(venue__nearest_station__icontains=nearest_station)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="List user's stocked venues",
        description="Returns a list of venues saved by the current user",
        parameters=[
            OpenApiParameter(
                name='is_favorite',
                description='Filter by favorite status',
                type=bool,
            ),
            OpenApiParameter(
                name='genre',
                description='Filter by genre',
                type=str,
            ),
            OpenApiParameter(
                name='nearest_station',
                description='Filter by nearest station',
                type=str,
            ),
            OpenApiParameter(
                name='order_types',
                description='Filter timeslots by order type (DINE_IN or TAKEOUT)',
                type=str,
                enum=['DINE_IN', 'TAKEOUT'],
            ),
        ],
        responses={
            200: OpenApiResponse(response=StockedVenueSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Add venue to stocked venues",
        description="Save a venue to the user's stocked venues list",
        request=StockedVenueSerializer,
        responses={
            201: OpenApiResponse(response=StockedVenueSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        venue_id = request.data.get("venue")

        instance = StockedVenue.objects.filter(
            user=user, venue_id=venue_id
        ).first()
        if instance:
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # First check if venue exists
        from omochi.venues.models import Venue
        venue = Venue.objects.filter(id=venue_id).first()
        
        if venue:
            from omochi.ref_logs.services import RefLogService
            RefLogService.log_stocked_venue(request.user, venue)
        
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Remove venue from stocked venues",
        description="Remove a venue from the user's stocked venues list",
        responses={
            204: OpenApiResponse(
                description="Venue removed from stocked venues"
            ),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Stocked venue not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Toggle favorite status",
        description="Toggle the favorite status of a stocked venue",
        responses={
            200: OpenApiResponse(description="Favorite status updated"),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Stocked venue not found"),
        },
    )
    @action(detail=True, methods=['put'])
    def favorite(self, request, pk=None):
        stocked_venue = self.get_object()
        stocked_venue.is_favorite = not stocked_venue.is_favorite
        stocked_venue.save()
        serializer = self.get_serializer(stocked_venue)
        return Response(serializer.data)
