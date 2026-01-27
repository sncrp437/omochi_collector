from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.contrib.auth import get_user_model

from .serializers import RefLogClickSerializer, RefLogResponseSerializer
from ..services import RefLogService

User = get_user_model()


class RefLogClickAPIView(APIView):
    """
    API view to log referral clicks
    """
    permission_classes = [permissions.IsAuthenticated]  # Require authenticated users
    
    @extend_schema(
        operation_id="log_ref_click",
        summary="Log referral click",
        description="Log when a user clicks on a referral link for a venue. If a similar log already exists for the same user, ref_code, and venue, it will skip creating a duplicate.",
        request=RefLogClickSerializer,
        responses={
            201: OpenApiResponse(
                response=RefLogResponseSerializer,
                description="Referral click logged successfully"
            ),
            200: OpenApiResponse(
                response=RefLogResponseSerializer,
                description="Similar log already exists, returning existing log"
            ),
            400: OpenApiResponse(
                description="Bad request, validation error"
            ),
            404: OpenApiResponse(
                description="Invalid referral code"
            )
        }
    )
    def post(self, request):
        """
        Log a referral click
        """
        serializer = RefLogClickSerializer(data=request.data)
        if serializer.is_valid():
            ref_code = serializer.validated_data['ref_code']
            venue_id = serializer.validated_data['venue_id']
            
            # Get the current user (could be None for anonymous users)
            user = request.user if request.user.is_authenticated else None
            
            # Log the click using the service
            ref_log = RefLogService.log_click(
                user=user,
                ref_code=ref_code,
                venue_id=venue_id
            )
            
            if ref_log is None:
                return Response(
                    None,
                    status=status.HTTP_204_NO_CONTENT
                )
            
            # Check if this was an existing log or newly created
            response_serializer = RefLogResponseSerializer(ref_log)
            
            # If the log was just created, return 201, otherwise 200
            if hasattr(ref_log, '_state') and ref_log._state.adding:
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(response_serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
