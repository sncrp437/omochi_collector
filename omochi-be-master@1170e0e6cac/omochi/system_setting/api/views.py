from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_spectacular.utils import extend_schema, OpenApiResponse

from omochi.system_setting.services import SystemSettingService
from omochi.system_setting.api.serializers import ApplicationFeeSerializer


class ApplicationFeeView(APIView):
    """
    API view to retrieve application fee information
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Get application fee information",
        description="Returns the current application fee amount and tax rate",
        responses={
            200: OpenApiResponse(
                response=ApplicationFeeSerializer,
                description="Application fee information retrieved successfully"
            )
        }
    )
    def get(self, request, *args, **kwargs):
        """
        Get application fee amount and tax rate
        """
        fee_amount = SystemSettingService.get_application_fee_amount()
        tax_rate = SystemSettingService.get_application_fee_tax_rate()
        
        data = {
            'amount': fee_amount,
            'tax_rate': tax_rate
        }
        
        serializer = ApplicationFeeSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)