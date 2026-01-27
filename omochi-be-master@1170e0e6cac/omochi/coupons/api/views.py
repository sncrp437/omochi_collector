import logging
import uuid
from django.db import transaction
from django.db.models import Q
from django.utils.timezone import now
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.exceptions import ValidationError

from ..models import Coupon, UserCoupon, CouponType
from ..services import CouponService
from .serializers import CouponSerializer, UserCouponSerializer

logger = logging.getLogger(__name__)


class CouponPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# Permission class for admin or owner read-only access
class IsAdminOrOwnerReadOnly(BasePermission):
    """
    Admin has full access, regular users can only view their own data.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_staff:
            return True

        # Regular users can only read
        return request.method in SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_staff:
            return True

        # Regular users can only access their own objects
        return request.method in SAFE_METHODS and obj.user == request.user


class CouponViewSet(viewsets.ModelViewSet):
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]
    pagination_class = CouponPagination

    def get_queryset(self):
        try:
            queryset = Coupon.objects.select_related('venue').all()
            venue_id = self.request.query_params.get('venue')
            coupon_type = self.request.query_params.get('type')
            if coupon_type:
                queryset = queryset.filter(type=coupon_type)
            if venue_id:
                queryset = queryset.filter(venue=venue_id)
            return queryset.order_by('-created_at')
        except Exception as e:
            logger.error(f"Error fetching coupons: {str(e)}")
            return Coupon.objects.none()

    @extend_schema(
        summary="List coupons",
        description="Retrieve a list of coupons",
        parameters=[
            OpenApiParameter(
                name='venue', description='Filter by venue ID', type=str
            ),
            OpenApiParameter(
                name='type', description='Filter by coupon type', type=str
            ),
        ],
        responses={
            200: OpenApiResponse(response=CouponSerializer(many=True)),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create coupon",
        description="Create a new coupon",
        request=CouponSerializer,
        responses={
            201: OpenApiResponse(response=CouponSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Venue not found"),
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Retrieve coupon",
        description="Retrieve details of a specific coupon by its ID.",
        responses={
            200: OpenApiResponse(response=CouponSerializer),
            404: OpenApiResponse(description="Coupon not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update coupon",
        description="Update the details of a specific coupon by its ID.",
        request=CouponSerializer,
        responses={
            200: OpenApiResponse(response=CouponSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Coupon not found"),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    extend_schema(
        summary="Delete coupon",
        description="Delete a specific coupon by its ID.",
        responses={
            204: OpenApiResponse(description="Coupon deleted successfully"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Coupon not found"),
        },
    )

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class UserCouponViewSet(viewsets.ModelViewSet):
    serializer_class = UserCouponSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            queryset = UserCoupon.objects.select_related('user', 'coupon', 'coupon__venue').all()
        else:
            queryset = UserCoupon.objects.select_related('coupon', 'coupon__venue').filter(
                user=user,
                is_used=False,
            ).filter(Q(expiry_date__gte=now()) | Q(expiry_date__isnull=True))

        venue_id = self.request.query_params.get('venue')
        user_id = self.request.query_params.get('user')
        
        if user_id:
            queryset = queryset.filter(user=user_id)
                
        if venue_id:
            queryset = queryset.filter(
                Q(coupon__venue_id=venue_id) | Q(coupon__venue__isnull=True)
            )
                
        return queryset.order_by('-created_at')

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create user coupon with transaction protection to prevent race conditions.
        """
        # For non-admin users, force the user field to be themselves
        if not self.request.user.is_staff:
            serializer.save(created_by=self.request.user, user=self.request.user)
        else:
            # Admin can create coupons for any user
            serializer.save(created_by=self.request.user)

    @extend_schema(
        summary="List user coupons",
        description="Retrieve a list of user coupons",
        parameters=[
            OpenApiParameter(
                name='venue', description='Filter by venue ID', type=str
            ),
            OpenApiParameter(
                name='user', description='Filter by user ID', type=str
            ),
        ],
        responses={
            200: OpenApiResponse(response=UserCouponSerializer(many=True)),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create user coupon",
        description="Create a new user coupon",
        request=UserCouponSerializer,
        responses={
            201: OpenApiResponse(response=UserCouponSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Retrieve user coupon",
        description="Retrieve details of a specific user coupon by its ID",
        responses={
            200: OpenApiResponse(response=UserCouponSerializer),
            404: OpenApiResponse(description="User coupon not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update user coupon",
        description="Update the details of a specific user coupon by its ID",
        request=UserCouponSerializer,
        responses={
            200: OpenApiResponse(response=UserCouponSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            404: OpenApiResponse(description="User coupon not found"),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete user coupon",
        description="Delete a specific user coupon by its ID",
        responses={
            204: OpenApiResponse(
                description="User coupon deleted successfully"
            ),
            404: OpenApiResponse(description="User coupon not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class CampaignCouponViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving campaign coupons by venue.
    """
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # No pagination - return all results

    def get_queryset(self):
        venue_id = self.request.query_params.get('venue_id')
        if not venue_id:
            return Coupon.objects.none()
        
        return Coupon.objects.select_related('venue').filter(
            type=CouponType.CAMPAIGN,
            venue_id=venue_id,
            is_active=True
        ).order_by('-created_at')

    @extend_schema(
        summary="List campaign coupons by venue",
        description="Retrieve a list of campaign coupons for a specific venue without pagination",
        parameters=[
            OpenApiParameter(
                name='venue_id', 
                description='Venue ID to filter campaign coupons', 
                required=True,
                type=str
            ),
        ],
        responses={
            200: OpenApiResponse(response=CouponSerializer(many=True)),
            400: OpenApiResponse(description="Missing venue_id parameter"),
        },
    )
    def list(self, request, *args, **kwargs):
        venue_id = request.query_params.get('venue_id')
        
        if not venue_id:
            return Response(
                {"error": "venue_id parameter is required"}, 
                status=400
            )
        
        return super().list(request, *args, **kwargs)


class CampaignUserCouponCreateView(viewsets.GenericViewSet):
    """
    ViewSet specifically for creating user coupons for CAMPAIGN type coupons only.
    Regular users can claim campaign coupons without admin privileges.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Claim campaign coupon",
        description="Allow authenticated users to claim campaign coupons for themselves",
        responses={
            201: OpenApiResponse(response=UserCouponSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            403: OpenApiResponse(description="Permission denied"),
        },
    )
    @action(detail=True, methods=['post'], url_path='claim')
    def claim_campaign_coupon(self, request, coupon_id=None):  # Changed parameter name
        """
        Create a user coupon for a campaign type coupon.
        """
        # Use service to create campaign user coupon with coupon_id from URL
        user_coupon = CouponService.create_campaign_user_coupon(
            user=request.user,
            coupon_id=coupon_id  # Use coupon_id parameter directly
        )
        
        # Return the created user coupon using the full serializer
        response_serializer = UserCouponSerializer(user_coupon)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
