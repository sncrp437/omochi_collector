from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import CouponViewSet, UserCouponViewSet, CampaignCouponViewSet, CampaignUserCouponCreateView

router = DefaultRouter()
router.register(r'master', CouponViewSet, basename='coupons')
router.register(r'user-coupons', UserCouponViewSet, basename='user-coupons')
router.register(r'campaign-coupons', CampaignCouponViewSet, basename='campaign-coupons')

# Custom URL for campaign user coupon with coupon_id parameter
urlpatterns = [
    path('', include(router.urls)),
    path(
        'campaign-user-coupon/<uuid:coupon_id>/claim/', 
        CampaignUserCouponCreateView.as_view({'post': 'claim_campaign_coupon'}),
        name='campaign-user-coupon-claim'
    ),
]
