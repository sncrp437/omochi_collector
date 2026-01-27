import { getListArticles } from "@/api/articles";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import CardArticleItem from "@/components/card/CardArticleItem";
import SkeletonCardArticleItem from "@/components/skeleton/SkeletonCardArticleItem";
import { ArticleList } from "@/generated/api";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Typography, Spin } from "antd";
import {
  MAX_SIZE_FETCH_ARTICLES,
  ARTICLE_LIST_STATE,
  ROUTE_PATH,
  VENUE_ROLE,
} from "@/utils/constants";
import SEOHeadData from "@/components/common/SEOHeadData";
import { RootState } from "@/store";
import { useSelector } from "react-redux";

const { Text } = Typography;

const ArticleListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const { t } = useTranslation();

  // Memoize URL search params
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const scrollToArticleId = useMemo(
    () => searchParams.get("scrollToArticle"),
    [searchParams]
  );

  // Pagination configuration similar to NotificationPage
  const initConfigLoadMore = useMemo(
    () => ({
      hasLoadMore: true,
      currentPage: 1,
      loadingLoadMore: false,
    }),
    []
  );

  const [configLoadMore, setConfigLoadMore] = useState(initConfigLoadMore);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [loadingScroll, setLoadingScroll] = useState(false);
  const [listArticles, setListArticles] = useState<ArticleList[]>([]);
  const currentPageRef = useRef(configLoadMore.currentPage);

  /**
   * Loads articles from session storage
   */
  const loadArticlesFromSessionStorage = useCallback(() => {
    try {
      const cachedState = sessionStorage.getItem(
        ARTICLE_LIST_STATE.SESSION_STORAGE_KEY
      );
      if (!cachedState) return false;

      const parsedState = JSON.parse(cachedState);
      const cacheAge = Date.now() - parsedState.timestamp;

      if (cacheAge >= ARTICLE_LIST_STATE.CACHE_EXPIRY_MS) {
        sessionStorage.removeItem(ARTICLE_LIST_STATE.SESSION_STORAGE_KEY);
        return false;
      }

      setListArticles(parsedState.articles);
      setConfigLoadMore(parsedState.configLoadMore);
      return true;
    } catch (error) {
      console.error("Error loading articles from session storage:", error);
      sessionStorage.removeItem(ARTICLE_LIST_STATE.SESSION_STORAGE_KEY);
      return false;
    }
  }, []);

  /**
   * Saves articles to session storage
   */
  const saveArticlesToSessionStorage = useCallback(() => {
    const currentState = {
      articles: listArticles,
      configLoadMore,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(
      ARTICLE_LIST_STATE.SESSION_STORAGE_KEY,
      JSON.stringify(currentState)
    );
  }, [listArticles, configLoadMore]);

  /**
   * Scrolls to a specific article element after data is loaded
   * @param articleId - The ID of the article to scroll to
   */
  const scrollToArticleElement = useCallback((articleId: string) => {
    setLoadingScroll(true);
    setTimeout(() => {
      requestAnimationFrame(() => {
        const element = document.getElementById(`article-${articleId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "instant",
            block: "center",
          });
          // Clear the parameter from URL after scrolling
          const url = new URL(window.location.href);
          url.searchParams.delete("scrollToArticle");
          window.history.replaceState({}, "", url.toString());
        }
        // Hide loading after scroll animation
        setTimeout(() => {
          setLoadingScroll(false);
        }, 200);
      });
    }, 100);
  }, []);

  // Fetch articles with pagination logic
  const fetchListArticles = useCallback(
    async (isLoadMore = false, page?: number) => {
      const targetPage = page ?? currentPageRef.current;
      try {
        if (isLoadMore) {
          setConfigLoadMore((prevConfig) => ({
            ...prevConfig,
            hasLoadMore: true,
            loadingLoadMore: true,
          }));
        } else {
          setLoadingFirst(true);
        }

        const response = await getListArticles(
          targetPage,
          MAX_SIZE_FETCH_ARTICLES
        );

        const results = response?.results || [];
        const totalLoaded = targetPage * MAX_SIZE_FETCH_ARTICLES;
        setConfigLoadMore((prevConfig) => ({
          ...prevConfig,
          hasLoadMore: totalLoaded < response.count,
        }));

        setListArticles((prevArticles) => {
          const newArticles = [...prevArticles, ...results];

          // Remove duplicates based on id
          const uniqueArticles = Array.from(
            new Map(newArticles.map((item) => [item.id, item])).values()
          );

          return uniqueArticles;
        });
      } catch (error) {
        console.error("Error fetching articles:", error);
        setListArticles([]);
        setConfigLoadMore({
          hasLoadMore: false,
          currentPage: 1,
          loadingLoadMore: false,
        });
      } finally {
        if (isLoadMore) {
          setConfigLoadMore((prevConfig) => ({
            ...prevConfig,
            loadingLoadMore: false,
          }));
        }
        setLoadingFirst(false);
      }
    },
    []
  );

  // Update currentPageRef when configLoadMore.currentPage changes
  useEffect(() => {
    currentPageRef.current = configLoadMore.currentPage;
  }, [configLoadMore.currentPage]);

  // Initial fetch
  useEffect(() => {
    // If we have scrollToArticleId, try to load from session storage first
    if (scrollToArticleId) {
      const hasCachedData = loadArticlesFromSessionStorage();
      if (hasCachedData) {
        // Scroll to article after loading cached data
        setTimeout(() => {
          scrollToArticleElement(scrollToArticleId);
        }, 100);
        return; // Don't fetch new data if we have cached data
      }
    }

    // No cached data or no scrollToArticleId, fetch fresh data
    setConfigLoadMore(initConfigLoadMore);
    setListArticles([]);
    fetchListArticles(false, 1);
  }, [
    scrollToArticleId,
    loadArticlesFromSessionStorage,
    scrollToArticleElement,
    fetchListArticles,
    initConfigLoadMore,
  ]);

  // Handle load more articles
  const handleLoadMore = () => {
    const nextPage = configLoadMore.currentPage + 1;
    setConfigLoadMore((prevConfig) => ({
      ...prevConfig,
      currentPage: nextPage,
    }));

    fetchListArticles(true, nextPage);
  };

  // Handle back navigation
  const handleBack = () => {
    if (!isAuthenticated || !user || user?.role === VENUE_ROLE) {
      navigate(`/${ROUTE_PATH.INTRODUCTION}`);
      return;
    }

    navigate(`/${ROUTE_PATH.USER.DASHBOARD}`);
  };

  return (
    <Spin
      spinning={loadingScroll}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <SEOHeadData
        title={`${t("article.title")} | Omochi`}
        description={t("seo.description_article_list")}
        canonical={window.location.href}
        ogUrl={window.location.href}
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={`${t("article.title")} !`}
          onBack={handleBack}
        />

        {/* Articles Content */}
        <div className="flex-1 flex flex-col w-full px-4 mt-4 gap-4 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth">
          {loadingFirst ? (
            Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCardArticleItem key={index} />
            ))
          ) : listArticles.length === 0 ? (
            <div className="flex-grow flex items-center justify-center py-4">
              <p className="text-sm-white">{t("general.no_data")}</p>
            </div>
          ) : (
            <>
              {listArticles?.map((article) => (
                <div key={article.id} id={`article-${article.id}`}>
                  <CardArticleItem
                    {...article}
                    onSaveState={saveArticlesToSessionStorage}
                  />
                </div>
              ))}

              {/* Load more section */}
              {listArticles.length > 0 && configLoadMore.hasLoadMore && (
                <>
                  {configLoadMore.loadingLoadMore ? (
                    // Show skeleton during load more
                    Array.from({ length: 3 }).map((_, index) => (
                      <SkeletonCardArticleItem key={`load-more-${index}`} />
                    ))
                  ) : (
                    // Show load more button
                    <div className="flex-col-center !w-full">
                      <Button
                        className="!w-[80px] !min-w-[80px] !h-[26px] !min-h-[26px] !max-h-[26px] !bg-[var(--card-background-color)] !border-none !rounded-lg !outline-none hover:!bg-[#404040]"
                        onClick={handleLoadMore}
                        loading={configLoadMore.loadingLoadMore}
                        disabled={
                          !configLoadMore.hasLoadMore ||
                          configLoadMore.loadingLoadMore
                        }
                      >
                        <Text className="text-xs-white">
                          {t("general.show_more_label")}
                        </Text>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Spin>
  );
};

export default ArticleListPage;
