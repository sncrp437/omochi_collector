import React, { useLayoutEffect, useMemo, useState, useCallback } from "react";
import { Form, Checkbox, Spin, Button, Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";

const { Title } = Typography;
import { useNavigate, useLocation } from "react-router-dom";
import { IconStar, IconFillStar } from "@/assets/icons";
import SelectInput from "@/components/common/form/SelectInput";
import CardStockStore from "@/components/card/CardStockStore";
import {
  ROUTE_PATH,
  STOCK_STORE_STATE,
  STOCK_VENUE_AVAILABLE_STATE,
} from "@/utils/constants";
import { getListStockVenues, addFavoriteVenue } from "@/api/stock-venue";
import { StockedVenue } from "@/generated/api";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import defaultImage from "@/assets/images/default-image.png";
import { useTranslation } from "react-i18next";
import ShareSNS from "@/components/common/modal/ShareSNS";
import { getListPrefectures } from "@/api/areas";
import { setPrefectures } from "@/store/slices/areaSlice";
import { Prefecture } from "@/types/areas";
import { useVenueFilter } from "@/hooks/useVenueFilter";
import GoogleAds from "@/components/common/ads/GoogleAds";

interface FilterValues {
  genre?: string;
  nearest_station?: string;
  is_favorite?: boolean;
}

interface StockStoreState {
  allVenues: StockedVenue[];
  formValues: FilterValues;
  checkedFavorite: boolean;
  scrollPosition: number;
  timestamp: number;
}

/**
 * Stock stores page component that displays a list of venues with filtering capabilities
 *
 * Features:
 * - Filter by genre and nearest station
 * - Favorite/unfavorite functionality
 * - Share functionality
 * - Scroll to specific store via URL parameter
 * - Session storage for state preservation
 *
 * @returns Stock stores page component
 */
const StockStoresPage = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [checkedFavorite, setCheckedFavorite] = useState(false);
  const [allVenues, setAllVenues] = useState<StockedVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<StockedVenue | null>(null);
  const userInfo = useSelector((state: RootState) => state.auth.user);

  // Watch form field changes to trigger re-renders
  const genreValue = Form.useWatch("genre", form);
  const stationValue = Form.useWatch("nearest_station", form);

  // Get current filter values - properly reactive to form changes
  const currentFilters = useMemo(
    () => ({
      genre: genreValue || "",
      nearest_station: stationValue || "",
      is_favorite: checkedFavorite,
    }),
    [genreValue, stationValue, checkedFavorite]
  );

  // Use custom hook for client-side filtering - much simpler!
  const { filteredVenues, genreFilterOptions, stationFilterOptions } =
    useVenueFilter(allVenues, currentFilters);

  // Memoize URL search params
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const scrollToStoreId = useMemo(
    () => searchParams.get("scrollToStore"),
    [searchParams]
  );

  /**
   * Saves current state to session storage
   */
  const saveStateToSessionStorage = useCallback(() => {
    const scrollContainer = document.querySelector(".scrollbar-hidden");
    const currentState: StockStoreState = {
      allVenues: filteredVenues,
      formValues: form.getFieldsValue(),
      checkedFavorite,
      scrollPosition: scrollContainer?.scrollTop || 0,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(
      STOCK_STORE_STATE.SESSION_STORAGE_KEY,
      JSON.stringify(currentState)
    );
  }, [filteredVenues, form, checkedFavorite]);

  /**
   * Loads form values and state from session storage
   */
  const loadStateFromSessionStorage = useCallback(() => {
    try {
      const cachedState = sessionStorage.getItem(
        STOCK_STORE_STATE.SESSION_STORAGE_KEY
      );

      if (!cachedState) return;

      const parsedState: StockStoreState = JSON.parse(cachedState);
      const cacheAge = Date.now() - parsedState.timestamp;

      if (cacheAge >= STOCK_STORE_STATE.CACHE_EXPIRY_MS) {
        // Clear expired cache
        sessionStorage.removeItem(STOCK_STORE_STATE.SESSION_STORAGE_KEY);
        return;
      }

      // Only restore form values and favorite state
      setCheckedFavorite(parsedState.checkedFavorite);
      form.setFieldsValue(parsedState.formValues);

      // Restore scroll position after a short delay
      setTimeout(() => {
        const scrollContainer = document.querySelector(".scrollbar-hidden");
        if (scrollContainer && parsedState.scrollPosition > 0) {
          scrollContainer.scrollTop = parsedState.scrollPosition;
        }
      }, 100);
    } catch (error) {
      console.error("Error loading state from session storage:", error);
      sessionStorage.removeItem(STOCK_STORE_STATE.SESSION_STORAGE_KEY);
    }
  }, [form]);

  /**
   * Clears session storage cache
   */
  const clearSessionStorageCache = useCallback(() => {
    sessionStorage.removeItem(STOCK_STORE_STATE.SESSION_STORAGE_KEY);
  }, []);

  /**
   * Scrolls to a specific store element after data is loaded
   * @param storeId - The ID of the store to scroll to
   */
  const scrollToStoreElement = useCallback((storeId: string) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const element = document.getElementById(`store-${storeId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "instant",
            block: "center",
          });
        }
      });
    }, 100);
  }, []);

  /**
   * Fetches prefecture stations from API and updates Redux store
   */
  const fetchPrefectureStations = useCallback(async () => {
    try {
      const response = await getListPrefectures();
      dispatch(setPrefectures(response as unknown as Prefecture[]));
    } catch (error) {
      console.error("Error fetching prefecture stations:", error);
    }
  }, [dispatch]);

  /**
   * Fetches ALL venues once (no filtering on server)
   */
  const fetchAllVenues = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all venues without any filters
      const response = await getListStockVenues();
      setAllVenues(response);

      // Scroll to store if scrollToStoreId exists
      if (scrollToStoreId && response.length > 0) {
        scrollToStoreElement(scrollToStoreId);
        // Clear the parameter from URL after scrolling
        const url = new URL(window.location.href);
        url.searchParams.delete("scrollToStore");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  }, [scrollToStoreId]);

  /**
   * Fetches all initial data (prefectures and venues)
   */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPrefectureStations(), fetchAllVenues()]);
    } catch (error) {
      console.error("Error fetching all data:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchPrefectureStations, fetchAllVenues]);

  useLayoutEffect(() => {
    // Restore form values and state from cache
    loadStateFromSessionStorage();

    // Always fetch fresh data from API
    fetchAllData();
  }, [fetchAllData, loadStateFromSessionStorage]);

  /**
   * Handles form filter changes - no API calls needed!
   */
  const handleFilterChange = useCallback(() => {
    // No need to fetch - filtering happens automatically via hook!
    clearSessionStorageCache();
  }, [clearSessionStorageCache]);

  /**
   * Handles favorite checkbox toggle
   */
  const handleCheckedFavorite = useCallback(() => {
    setCheckedFavorite((prev) => !prev);
    form.setFieldValue("is_favorite", !checkedFavorite);
    handleFilterChange();
  }, [checkedFavorite, form, handleFilterChange]);

  /**
   * Handles favorite click with spam prevention
   * @param stockedVenue - The venue to favorite/unfavorite
   */
  const handleFavoriteClick = useCallback(
    async (stockedVenue: StockedVenue) => {
      try {
        if (isFavoriteLoading) return; // Prevent spam clicking
        setIsFavoriteLoading(true);

        if (stockedVenue.is_favorite) {
          await addFavoriteVenue(stockedVenue.id, {
            is_favorite: false,
            venue: stockedVenue.venue_details.id,
          });
          setAllVenues((prevVenues: StockedVenue[]) =>
            prevVenues.map((venue: StockedVenue) =>
              venue.id === stockedVenue.id
                ? { ...venue, is_favorite: false }
                : venue
            )
          );
        } else {
          await addFavoriteVenue(stockedVenue.id, {
            is_favorite: true,
            venue: stockedVenue.venue_details.id,
          });
          setAllVenues((prevVenues: StockedVenue[]) =>
            prevVenues.map((venue: StockedVenue) =>
              venue.id === stockedVenue.id
                ? { ...venue, is_favorite: true }
                : venue
            )
          );
        }

        // Save updated state after favorite action
        setTimeout(saveStateToSessionStorage, 0);
      } catch (error) {
        console.error("Error updating favorite status:", error);
      } finally {
        setIsFavoriteLoading(false);
      }
    },
    [isFavoriteLoading, saveStateToSessionStorage]
  );

  /**
   * Handles share button click
   * @param stockedVenue - The venue to share
   */
  const handleShareClick = useCallback(async (stockedVenue: StockedVenue) => {
    setSelectedVenue(stockedVenue);
    setIsShareModalOpen(true);
  }, []);

  /**
   * Handles closing the share modal
   */
  const handleCloseShareModal = useCallback(() => {
    setIsShareModalOpen(false);
    setSelectedVenue(null);
  }, []);

  /**
   * Handles navigation back to dashboard
   */
  const handleBackNavigation = useCallback(() => {
    clearSessionStorageCache();
    navigate(`/${ROUTE_PATH.USER.DASHBOARD}`);
  }, [navigate, clearSessionStorageCache]);

  /**
   * Handles navigation to stock venue available page with current filter values
   */
  const navigateToStockVenueAvailable = useCallback(() => {
    const formValues = form.getFieldsValue();
    const searchParams = new URLSearchParams();

    if (formValues.genre) {
      searchParams.set("genre", formValues.genre);
    }
    if (formValues.nearest_station) {
      searchParams.set("nearest_station", formValues.nearest_station);
    }
    if (formValues.is_favorite) {
      searchParams.set("is_favorite", formValues.is_favorite.toString());
    }

    // Save current state before navigation
    saveStateToSessionStorage();

    // Clear StockVenueAvailable cache to ensure fresh data
    sessionStorage.removeItem(STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY);

    const queryString = searchParams.toString();
    const url = `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.STOCK_STORE}/${
      ROUTE_PATH.USER.STOCK_VENUE_AVAILABLE
    }${queryString ? `?${queryString}` : ""}`;

    navigate(url);
  }, [form, navigate, saveStateToSessionStorage]);

  return (
    <>
      <SEOHeadData
        title={`${t("share.stock_store_title")} | Omochi`}
        description={t("share.stock_store_title")}
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
        robots="noindex, nofollow"
      />
      <Spin
        spinning={loading}
        size="large"
        wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
        className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
      >
        <div className="flex flex-col items-center gap-4 !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
          {/* Top navigation bar */}
        <TopNavigationBar
          title={t("share.stock_store_title")}
          onBack={handleBackNavigation}
          hasRightIcons
          needUserGuide
        />

        {/* H1 for SEO - Page title */}
        <Title
          level={1}
          className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
          style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
        >
          {t("share.stock_store_title")} - Omochi
        </Title>

        {/* Form Filter */}
        <Form
          form={form}
          name="stockStore"
          layout="horizontal"
          requiredMark={false}
          className="!w-full !flex !items-center !gap-2 !px-4"
          onValuesChange={handleFilterChange}
        >
          <Form.Item
            name="genre"
            className="!m-0 form-item-select-middle flex-1"
          >
            <SelectInput
              placeholder={t("venue.label.genre_label")}
              options={genreFilterOptions}
              size="middle"
              className="!text-white placeholder-fix"
              popupClassName="!bg-[var(--background-color)] !text-white"
              rootClassName="custom-select"
              showSearch
            />
          </Form.Item>
          <Form.Item
            name="nearest_station"
            className="!m-0 form-item-select-middle flex-1"
          >
            <SelectInput
              placeholder={t("venue.label.neartest_station_label")}
              options={stationFilterOptions}
              size="middle"
              className="!text-white placeholder-fix"
              popupClassName="!bg-[var(--background-color)] !text-white"
              rootClassName="custom-select"
              showSearch
            />
          </Form.Item>

          <Form.Item name="is_favorite" className="!m-0">
            <Checkbox
              checked={checkedFavorite}
              onChange={handleCheckedFavorite}
              className={`flex-row-center !rounded-sm !w-8 !h-8 !min-w-8 !min-h-8 !border !outline-none [&_.ant-checkbox-inner]:!hidden ${
                checkedFavorite
                  ? "!bg-[#FFCC00] !border-[#FFCC00]"
                  : "!bg-transparent !border-white "
              }`}
            >
              <img
                src={checkedFavorite ? IconFillStar : IconStar}
                alt="Icon Favorite"
                className="object-contain w-5 h-5 min-w-5 min-h-5 max-h-5"
              />
            </Checkbox>
          </Form.Item>
        </Form>

        {/* Button check availability */}
        <div className="!px-4 !w-full ">
          <Button
            type="primary"
            className={`!h-10 !max-h-10 !min-h-10 !font-bold !w-full !border-none !rounded-lg !flex !items-center !justify-center !px-4 !outline-none ${
              !filteredVenues.length
                ? "button-disabled"
                : "!bg-[var(--background-teal-color)] !text-white"
            }`}
            onClick={navigateToStockVenueAvailable}
            disabled={!filteredVenues.length}
          >
            {t("general.check_availability_label")}
          </Button>
        </div>

        {/* Stock Stores Content */}
        <div className="flex flex-col w-full gap-4 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth px-4 h-full">
          {!loading && filteredVenues.length === 0 ? (
            <div className="flex-grow flex items-center justify-center h-full">
              <p className="text-white text-center">{t("general.no_data")}</p>
            </div>
          ) : (
            <>
              {/* Hidden H2 for SEO - Venues Section */}
              <Title
                level={2}
                className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
                style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
              >
                {t("share.stock_store_title")} - {t("share.stock_store_title")}
              </Title>
              {filteredVenues.map((store, index: number) => (
                <React.Fragment key={store.id}>
                  <div id={`store-${store.venue_details.id}`}>
                    <CardStockStore
                      listCampaigns={store.campaigns}
                      srcImg={store.venue_details.logo || defaultImage}
                      storeName={store.venue_details.name}
                      enableEatIn={
                        store.venue_details.enable_eat_in ||
                        store.venue_details.enable_reservation
                      }
                      enableTakeOut={store.venue_details.enable_take_out}
                      genre={store.venue_details.genre}
                      nearestStation={store.venue_details.nearest_station}
                      address={store.venue_details.address}
                      isFavorite={store.is_favorite}
                      onFavoriteClick={() => handleFavoriteClick(store)}
                      onShareClick={() => handleShareClick(store)}
                      onSaveState={saveStateToSessionStorage}
                      onClick={() => {
                        saveStateToSessionStorage();
                        navigate(
                          `/${ROUTE_PATH.STORE.ROOT_STORE}/${store.venue_details.id}?from=${STOCK_STORE_STATE.FROM_PARAM}`
                        );
                      }}
                    />
                  </div>

                  {/* Add Google Ads after the first venue */}
                  {index === 0 && (
                    <div className="!w-full -my-2 !max-w-[500px]">
                      <GoogleAds
                        adClient={import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID}
                        adSlot={import.meta.env.VITE_ADS_SLOT_STOCK_VENUE}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </div>

        {/* Share Modal */}
        {selectedVenue && (
          <ShareSNS
            isOpen={isShareModalOpen}
            onClose={handleCloseShareModal}
            title={`${t("general.share_title")}\n`}
            hashtags={`#omochi`}
            url={[
              {
                title: selectedVenue.venue_details.name,
                url: `${window.location.origin}/store/${
                  selectedVenue.venue_details.id
                }?ref=${userInfo?.ref_code || ""}`,
              },
            ]}
          />
        )}
      </div>
      </Spin>
    </>
  );
});

export default StockStoresPage;
