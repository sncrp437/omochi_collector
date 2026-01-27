import { getArticleDetail } from "@/api/articles";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { ArticleDetail } from "@/generated/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Typography, Spin } from "antd";
import defaultImage from "@/assets/images/default-image.png";
import { ROUTE_PATH } from "@/utils/constants";
import { isEmpty } from "@/utils/helper";
import BaseBreadCrumb from "@/components/common/BaseBreadCrumb";
import VenueAffiliateBox from "@/components/common/VenueAffiliateBox";
import { convertUtcDateToJapaneseWithYear } from "@/utils/date";

const { Title, Text } = Typography;

const ArticleDetailPage = () => {
  const { t } = useTranslation();
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();

  // State management
  const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(
    null
  );
  const [loadingFirst, setLoadingFirst] = useState(false);

  // Fetch article detail
  const fetchArticleDetail = useCallback(async () => {
    if (!articleId) {
      navigate(`/${ROUTE_PATH.NOT_FOUND}`, { replace: true });
      return;
    }

    setLoadingFirst(true);

    try {
      const response = await getArticleDetail(articleId);
      setArticleDetail(response);
    } catch (error) {
      console.error("Error fetching article detail:", error);
      navigate(`/${ROUTE_PATH.NOT_FOUND}`, { replace: true });
    } finally {
      setLoadingFirst(false);
    }
  }, [articleId, navigate]);

  // Handle back navigation
  const handleBack = () => {
    navigate(`/${ROUTE_PATH.ARTICLE}?scrollToArticle=${articleId}`);
  };

  // Memoized content cleaning
  const cleanedArticleContent = useMemo(() => {
    if (!articleDetail?.content) {
      return "";
    }
    return articleDetail.content
      .replace(/>\s+\n\s+</g, "><")
      .replace(/\n{2,}/g, "\n");
  }, [articleDetail?.content]);

  // Fetch data on component mount
  useEffect(() => {
    fetchArticleDetail();
  }, [fetchArticleDetail]);

  if (loadingFirst) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full ">
        <Spin
          spinning={loadingFirst}
          size="large"
          className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        />
      </div>
    );
  }

  // If no article data after loading, redirect to not-found
  if (
    !loadingFirst &&
    (!articleDetail || isEmpty(articleDetail) || isEmpty(articleDetail?.id))
  ) {
    navigate(`/${ROUTE_PATH.NOT_FOUND}`, { replace: true });
    return null;
  }

  // Early return if no article data (should not reach here due to redirect above)
  if (!articleDetail) {
    return null;
  }

  const {
    title,
    description = "",
    summary = "",
    content_image_url = "",
    venue_affiliates,
    created_at = "",
    seo_image_url = "",
  } = articleDetail;

  return (
    <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      <SEOHeadData
        title={`${title} | Omochi`}
        description={description || summary || undefined}
        canonical={window.location.href}
        ogImage={seo_image_url || content_image_url || undefined}
        ogUrl={window.location.href}
        ogType="article"
        keywords={title}
      />
      <TopNavigationBar
        title={t("article.article_detail_title")}
        onBack={handleBack}
      />

      {/* Article Detail */}
      <div className="flex-1 flex flex-col w-full px-4 my-4 gap-4 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth">
        {/* Breadcrumb */}
        <BaseBreadCrumb
          items={[
            {
              title: (
                <Link
                  to={`/${ROUTE_PATH.ARTICLE}?scrollToArticle=${articleId}`}
                >
                  {t("article.title")}
                </Link>
              ),
            },
            {
              title: title,
            },
          ]}
        />

        {/* Article Title */}
        <Title level={1} className="text-base-white !font-bold !mb-0">
          {title}
        </Title>

        {/* Article Summary */}
        <div
          className="text-sm-white !whitespace-pre-wrap word-break"
          dangerouslySetInnerHTML={{ __html: summary || "" }}
        />

        {/* Article Image */}
        {content_image_url && (
          <div className="w-full rounded-[9px]">
            <img
              src={content_image_url}
              alt={title}
              className="w-full rounded-[9px]"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = defaultImage;
              }}
              fetchPriority="high"
              title={title}
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="text-sm-white !whitespace-pre-wrap article-content word-break"
          dangerouslySetInnerHTML={{ __html: cleanedArticleContent }}
        />

        <Text className="!text-xs !text-[var(--breadcrumb-color)] font-family-base !leading-[1.2em]">
          {t("article.created_at_label", {
            date: convertUtcDateToJapaneseWithYear(created_at),
          })}
        </Text>

        <div className="flex flex-col gap-4">
          {venue_affiliates?.map((venueAffiliate) => (
            <VenueAffiliateBox
              key={venueAffiliate.id}
              venueAffiliate={venueAffiliate}
              articleId={articleId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
