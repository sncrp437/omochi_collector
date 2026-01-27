from rest_framework import serializers
from omochi.payments.models import PaymentTransaction
from omochi.orders.models import Order


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ['id', 'order', 'amount', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class PaymentCheckoutSessionSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    return_url = serializers.URLField(required=False)

    def validate_order_id(self, value):
        try:
            order = Order.objects.get(id=value)
            if order.payment_status == 'PAID':
                raise serializers.ValidationError("This order has already been paid for.")
            return value
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order does not exist.")


class PaymentStatusSerializer(serializers.Serializer):
    session_id = serializers.CharField()