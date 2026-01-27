from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models import Cart
from .serializers import CartSerializer


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.select_related("menu_item").all()
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
