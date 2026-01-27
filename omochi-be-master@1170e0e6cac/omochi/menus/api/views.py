from django.shortcuts import get_object_or_404
from omochi.common.multilingual_service import MULTILINGUAL_ENUM
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _
from rest_framework.serializers import ValidationError
from django.db.models import Q

from omochi.menus.models import MenuCategory, MenuItem
from omochi.venues.api.views import IsVenueManagerOrAdmin
from omochi.venues.models import Venue
from .serializers import (
    MenuCategorySerializer,
    MenuCategoryWithItemsSerializer,
    MenuItemDetailSerializer,
    MenuItemSerializer,
    MenuItemStockUpdateSerializer,
)


class MenuCategoryViewSet(viewsets.ModelViewSet):
    """API endpoints for managing menu categories"""

    serializer_class = MenuCategorySerializer
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsVenueManagerOrAdmin,
    ]

    def get_queryset(self):
        venue_id = self.kwargs.get('venue_id')
        # return venue categories and global categories
        return MenuCategory.objects.filter(Q(venue_id=venue_id) | Q(venue_id=None))

    def get_serializer_class(self):
        if self.action == 'list_with_items':
            return MenuCategoryWithItemsSerializer
        return MenuCategorySerializer

    def perform_create(self, serializer):
        venue_id = self.kwargs.get('venue_id')
        venue = get_object_or_404(Venue, id=venue_id)
        serializer.save(venue=venue)

    @extend_schema(
        summary="List menu categories",
        description="Returns a list of menu categories for a venue",
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
            200: OpenApiResponse(response=MenuCategorySerializer(many=True)),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create menu category",
        description="Create a new menu category for a venue (venue managers or admins only)",
        request=MenuCategorySerializer,
        responses={
            201: OpenApiResponse(response=MenuCategorySerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Get menu category details",
        description="Get detailed information about a menu category",
        responses={
            200: OpenApiResponse(response=MenuCategorySerializer),
            404: OpenApiResponse(description="Category not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update menu category",
        description="Update a menu category (venue managers or admins only)",
        request=MenuCategorySerializer,
        responses={
            200: OpenApiResponse(response=MenuCategorySerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Category not found"),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete menu category",
        description="Delete a menu category (venue managers or admins only)",
        responses={
            204: OpenApiResponse(description="Category deleted successfully"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Category not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="List categories with items",
        description="Get all menu categories with their associated menu items",
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
                response=MenuCategoryWithItemsSerializer(many=True)
            ),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    @action(detail=False, methods=['get'])
    def list_with_items(self, request, venue_id=None):
        queryset = self.get_queryset()
        # pass full context to serializer to enable multilingual
        context = self.get_serializer_context()
        context['venue_id'] = venue_id
        serializer = self.get_serializer(queryset, many=True, context=context)
        return Response(serializer.data)


class MenuItemViewSet(viewsets.ModelViewSet):
    """API endpoints for managing menu items"""

    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsVenueManagerOrAdmin,
    ]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        venue_id = self.kwargs.get('venue_id')
        return MenuItem.objects.filter(venue_id=venue_id).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MenuItemDetailSerializer
        elif self.action == 'bulk_update_stock':
            return MenuItemStockUpdateSerializer
        return MenuItemSerializer

    def perform_create(self, serializer):
        venue_id = self.kwargs.get('venue_id')
        venue = get_object_or_404(Venue, id=venue_id)
        category_id = self.request.data.get('category')
        is_alcoholic = False
        is_priority_pass = False
        if category_id:
            try:
                category = MenuCategory.objects.get(id=category_id)
                if category.name == 'アルコール':
                    is_alcoholic = True
                if category.name == '優先券' and category.venue is None:
                    if MenuItem.objects.filter(venue=venue, is_priority_pass=True).exists():
                        raise ValidationError({"category": _("Venue can only have one priority pass")})
                    is_priority_pass = True
            except MenuCategory.DoesNotExist:
                pass
        instance = serializer.save(venue=venue, is_alcoholic=is_alcoholic, is_priority_pass=is_priority_pass)
        # Set origin_id to its own id if not already set
        if not instance.origin_id:
            instance.origin_id = instance.id
            instance.save(update_fields=["origin_id"]) 

    @extend_schema(
        summary="List menu items",
        description="Returns a list of menu items for a venue",
        parameters=[
            OpenApiParameter(
                name='category', description='Filter by category ID', type=str
            ),
            OpenApiParameter(
                name='is_available',
                description='Filter by availability',
                type=bool,
            ),
            OpenApiParameter(
                name='multilingual',
                description='Enable multilingual translation based on Accept-Language header. Set to "false" to disable and return original data (default: "true")',
                type=str,
                default='true',
                enum=MULTILINGUAL_ENUM
            ),
        ],
        responses={
            200: OpenApiResponse(response=MenuItemSerializer(many=True)),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        category_id = request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        # Ensure ordering by created_at is maintained
        queryset = queryset.order_by('created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create menu item",
        description="Create a new menu item for a venue (venue managers or admins only). Use multipart/form-data when uploading menu item images.",
        request=MenuItemSerializer,
        responses={
            201: OpenApiResponse(response=MenuItemSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Venue not found"),
        },
        methods=["POST"],
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Get menu item details",
        description="Get detailed information about a menu item",
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
            200: OpenApiResponse(response=MenuItemDetailSerializer),
            404: OpenApiResponse(description="Menu item not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update menu item",
        description="Update a menu item (venue managers or admins only). Use multipart/form-data when uploading menu item images.",
        request=MenuItemSerializer,
        responses={
            200: OpenApiResponse(response=MenuItemSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Menu item not found"),
        },
        methods=["PUT", "PATCH"],
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return the new instance data
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        category_id = self.request.data.get('category')
        is_alcoholic = instance.is_alcoholic
        if category_id:
            try:
                category = MenuCategory.objects.get(id=category_id)
                if category.name == 'アルコール':
                    is_alcoholic = True
                else:
                    is_alcoholic = False
            except MenuCategory.DoesNotExist:
                pass
        from django.db import transaction
        with transaction.atomic():
            # Store the original created_at value
            original_created_at = instance.created_at
            
            # Soft delete the existing instance
            instance.delete()
            
            # Prepare data for the new instance
            new_item_data = {}
            for field in instance._meta.fields:
                if field.name not in ['id', 'updated_at', 'deleted_at']:
                    new_item_data[field.name] = getattr(instance, field.name)
            
            # Apply serializer updates
            for attr, value in serializer.validated_data.items():
                new_item_data[attr] = value
            
            new_item_data['is_alcoholic'] = is_alcoholic
            # Explicitly preserve the original created_at timestamp
            new_item_data['created_at'] = original_created_at
            
            # Determine new origin_id logic (keep original logic)
            origin_id = instance.origin_id
            # Update the soft-deleted instance's origin_id if needed
            if not origin_id:
                origin_id = instance.id
                instance.origin_id = instance.id
                instance.save(update_fields=["origin_id"])
            new_item_data['origin_id'] = origin_id
            
            # Create a new instance without auto_now_add being triggered
            # Remove created_at from the data temporarily
            created_at_value = new_item_data.pop('created_at')
            new_instance = MenuItem.objects.create(**new_item_data)
            
            # Update the created_at manually after creation
            MenuItem.objects.filter(id=new_instance.id).update(created_at=created_at_value)
            
            # Refresh the instance to get the updated created_at
            new_instance.refresh_from_db()
            serializer.instance = new_instance

    @extend_schema(
        summary="Delete menu item",
        description="Delete a menu item (venue managers or admins only)",
        responses={
            204: OpenApiResponse(description="Menu item deleted successfully"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Menu item not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        venue_id = self.kwargs.get('venue_id')
        pk = self.kwargs.get(self.lookup_field, None)
        try:
            MenuItem.objects.get(pk=pk, venue_id=venue_id)
        except MenuItem.DoesNotExist:
            return Response(
                {"error": _("Menu item not found.")},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=False,
        methods=['post'],
        url_path='bulk-update-stock',
        parser_classes=[JSONParser],
    )
    def bulk_update_stock(self, request, *args, **kwargs):
        venue_id = self.kwargs.get('venue_id')
        if not venue_id:
            return Response(
                {"error": "Venue ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            venue = Venue.objects.get(id=venue_id)
        except Venue.DoesNotExist:
            return Response(
                {"error": "Venue not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MenuItemStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        menu_item_ids = serializer.validated_data['menu_item_ids']

        if not menu_item_ids:
            MenuItem.objects.filter(venue=venue, is_out_of_stock=True).update(
                is_out_of_stock=False
            )
            return Response(
                {
                    "message": "All menu items have been marked as in stock.",
                },
                status=status.HTTP_200_OK,
            )

        MenuItem.objects.filter(id__in=menu_item_ids, venue=venue).update(
            is_out_of_stock=True
        )

        MenuItem.objects.filter(
            venue=venue, is_out_of_stock=True
        ).exclude(id__in=menu_item_ids).update(is_out_of_stock=False)
        
        return Response(
            {"message": "Stock status updated successfully."},
            status=status.HTTP_200_OK,
        )
