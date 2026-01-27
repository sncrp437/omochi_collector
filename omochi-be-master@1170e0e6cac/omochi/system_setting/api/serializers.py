from rest_framework import serializers


class ApplicationFeeSerializer(serializers.Serializer):
    """
    Serializer for application fee information
    """
    amount = serializers.IntegerField(help_text="Application fee amount in JPY")
    tax_rate = serializers.FloatField(help_text="Tax rate as a decimal")