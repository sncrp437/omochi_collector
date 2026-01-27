from rest_framework.views import APIView
from omochi.common.multilingual_service import MULTILINGUAL_ENUM
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status
from omochi.areas.models import Area
from rest_framework.permissions import AllowAny

class PrefecturesWithStationsView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="List prefectures with stations",
        description="Returns a list of prefectures and their stations",
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
            200: OpenApiResponse(description="List of prefectures and stations"),
        },
    )
    def get(self, request):
        prefectures = Area.objects.values_list('prefecture', flat=True).distinct().order_by('prefecture')
        result = []
        for prefecture in prefectures:
            stations = Area.objects.filter(prefecture=prefecture).order_by('station').values_list('station', flat=True)
            result.append({
                'prefecture': prefecture,
                'stations': list(stations)
            })
        return Response(result, status=status.HTTP_200_OK)