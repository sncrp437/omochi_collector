import { useLayoutEffect, useMemo, useState, useCallback } from "react";
import { Button, Form, Spin } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import SelectInput from "@/components/common/form/SelectInput";
import { ROUTE_PATH } from "@/utils/constants";
import { getListStockVenues } from "@/api/stock-venue";
import { StockedVenue } from "@/generated/api";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import defaultImage from "@/assets/images/default-image.png";
import { useTranslation } from "react-i18next";
import ShareSNS from "@/components/common/modal/ShareSNS";
import CardShareStock from "@/components/card/CardShareStock";
import { getListPrefectures } from "@/api/areas";
import { setPrefectures } from "@/store/slices/areaSlice";
import { Prefecture } from "@/types/areas";
import { useVenueFilter } from "@/hooks/useVenueFilter";
import React from "react";

/**
 * Share page component that allows users to select and share venues
 *
 * Features:
 * - Filter venues by genre and nearest station
 * - Multi-select venues for sharing
 * - Share multiple venues via social media
 *
 * @returns Share page component
 */
const SharePage = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [allVenues, setAllVenues] = useState<StockedVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedVenues, setSelectedVenues] = useState<StockedVenue[]>([]);
  const userInfo = useSelector((state: RootState) => state.auth.user);

  // Watch form field changes to trigger re-renders
  const genreValue = Form.useWatch("genre", form);
  const stationValue = Form.useWatch("nearest_station", form);

  // Get current filter values - properly reactive to form changes
  const currentFilters = useMemo(
    () => ({
      genre: genreValue || "",
      nearest_station: stationValue || "",
    }),
    [genreValue, stationValue]
  );

  // Use custom hook for client-side filtering - much simpler!
  const { filteredVenues, genreFilterOptions, stationFilterOptions } =
    useVenueFilter(allVenues, currentFilters);

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
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches all initial data (prefectures and venues)
   */
  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([fetchPrefectureStations(), fetchAllVenues()]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  }, [fetchPrefectureStations, fetchAllVenues]);

  useLayoutEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * Handles checkbox change for venue selection
   * @param stockedVenue - The venue to select/deselect
   * @param checked - Whether the venue is checked or not
   */
  const handleCheckboxChange = useCallback(
    (stockedVenue: StockedVenue, checked: boolean) => {
      if (checked) {
        setSelectedVenues((prevSelected) => [...prevSelected, stockedVenue]);
      } else {
        setSelectedVenues((prevSelected) =>
          prevSelected.filter((venue) => venue.id !== stockedVenue.id)
        );
      }
    },
    []
  );

  /**
   * Handles share button click - opens share modal if venues are selected
   */
  const handleShareClick = useCallback(() => {
    if (selectedVenues.length > 0) {
      setIsShareModalOpen(true);
    }
  }, [selectedVenues.length]);

  /**
   * Handles closing the share modal
   */
  const handleCloseShareModal = useCallback(() => {
    setIsShareModalOpen(false);
  }, []);

  /**
   * Handles navigation back to dashboard
   */
  const handleBackNavigation = useCallback(() => {
    navigate(`/${ROUTE_PATH.USER.DASHBOARD}`);
  }, [navigate]);

  // Memoize share button disabled state
  const isShareButtonDisabled = useMemo(
    () => selectedVenues.length === 0,
    [selectedVenues.length]
  );

  // Memoize share URLs for selected venues
  const shareUrls = useMemo(() => {
    return selectedVenues.map((venue) => ({
      title: venue.venue_details.name,
      url: `${window.location.origin}/store/${venue.venue_details.id}?ref=${
        userInfo?.ref_code || ""
      }`,
    }));
  }, [selectedVenues, userInfo?.ref_code]);

  return (
    <Spin
      spinning={loading}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="flex flex-col items-center gap-4 !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("share.share_store_title")}
          onBack={handleBackNavigation}
        />

        {/* Form Filter */}
        <Form
          form={form}
          name="stockStore"
          layout="horizontal"
          requiredMark={false}
          className="!w-full !flex !items-center !gap-2 !px-4"
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
        </Form>

        {/* Stock Stores Content */}
        <div className="flex flex-col w-full gap-4 scrollbar-hidden overflow-y-auto scroll-smooth px-4 h-full pb-[45px]">
          {!loading && filteredVenues.length === 0 ? (
            <div className="flex-grow flex items-center justify-center h-full">
              <p className="text-white text-center">{t("general.no_data")}</p>
            </div>
          ) : (
            filteredVenues.map((store) => (
              <CardShareStock
                key={store.id}
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
                isChecked={selectedVenues.some(
                  (venue) => venue.id === store.id
                )}
                onCheckChange={(checked) =>
                  handleCheckboxChange(store, checked)
                }
              />
            ))
          )}
        </div>

        {/* Share Button */}
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            className={`!flex-1 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
              isShareButtonDisabled
                ? "button-disabled"
                : " !bg-[var(--primary-color)] !text-white"
            }`}
            style={{ height: "unset" }}
            onClick={handleShareClick}
            disabled={isShareButtonDisabled}
          >
            <div className="flex items-center justify-center gap-2">
              {t("share.btn_share")} ({selectedVenues.length})
            </div>
          </Button>
        </div>

        {/* Share Modal */}
        {selectedVenues.length > 0 && (
          <ShareSNS
            isOpen={isShareModalOpen}
            onClose={handleCloseShareModal}
            title={`${t("general.share_title")}\n`}
            hashtags={`#omochi`}
            url={shareUrls}
          />
        )}
      </div>
    </Spin>
  );
});

export default SharePage;
