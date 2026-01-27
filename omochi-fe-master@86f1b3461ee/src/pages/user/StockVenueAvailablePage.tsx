import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { Form, Spin, Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";

const { Title } = Typography;
import { useNavigate, useLocation } from "react-router-dom";
import SelectInput from "@/components/common/form/SelectInput";
import {
  ORDER_TYPE_OPTIONS,
  ROUTE_PATH,
  STOCK_VENUE_AVAILABLE_STATE,
  TIME_ZONE,
} from "@/utils/constants";
import { getListStockVenues } from "@/api/stock-venue";
import { OrderTypeEnum, StockedVenue } from "@/generated/api";
import { useTranslation } from "react-i18next";
import CardStockVenueAvailable from "@/components/card/CardStockVenueAvailable";
import dayjs from "dayjs";
import {
  generateTimeslotsFrom,
  getTokyoNow,
  roundUpToNext15Min,
  isEmpty,
  findSatisfyingVenueTimeslot,
} from "@/utils/helper";
import CustomTag from "@/components/common/CustomTag";
import GoogleAds from "@/components/common/ads/GoogleAds";

const StockVenueAvailablePage = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [venuesRaw, setVenuesRaw] = useState<StockedVenue[]>([]);
  const [venuesFiltered, setVenuesFiltered] = useState<StockedVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeSlotsFiltered, setTimeSlotsFiltered] = useState<
    { id: string; time: string }[]
  >([]);
  const [timeSlotSelected, setTimeSlotSelected] = useState<{
    id: string;
    time: string;
  } | null>(null);

  // Refs for time slot horizontal scrolling
  const timeSlotContainerRef = useRef<HTMLDivElement>(null);
  const timeSlotRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isInitialLoadRef = useRef(true); // Track if this is initial load or user interaction

  const orderTypeOptions = ORDER_TYPE_OPTIONS.map((option) => ({
    label: t(option.label),
    value: option.value,
  }));

  // Memoize URL search params
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const getStartTimeFromVenues = useCallback(
    (venues: StockedVenue[]): dayjs.Dayjs | null => {
      const nowPlus15 = getTokyoNow().add(15, "minute");
      const todayStr = nowPlus15.format("YYYY-MM-DD");

      let minValidTime: dayjs.Dayjs | null = null;

      venues.forEach((venue) => {
        const timeslots = venue.timeslots || [];

        timeslots.forEach((ts) => {
          if (ts.is_paused || ts.remaining_slots <= 0) return;

          const dt = dayjs.tz(`${todayStr}T${ts.start_time}`, TIME_ZONE);

          if (dt.isSame(nowPlus15) || dt.isAfter(nowPlus15)) {
            if (!minValidTime || dt.isBefore(minValidTime)) {
              minValidTime = dt;
            }
          }
        });
      });

      return minValidTime ? roundUpToNext15Min(minValidTime) : null;
    },
    []
  );

  // Helper function to get cached data from sessionStorage
  const getCachedData = useCallback(() => {
    const cachedState = sessionStorage.getItem(
      STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY
    );

    if (cachedState) {
      try {
        const parsedState = JSON.parse(cachedState);
        const cacheAge = Date.now() - parsedState.timestamp;

        if (cacheAge < STOCK_VENUE_AVAILABLE_STATE.CACHE_EXPIRY_MS) {
          return parsedState;
        } else {
          // Clear expired cache
          sessionStorage.removeItem(
            STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY
          );
        }
      } catch (error) {
        console.error("Error parsing cached state:", error);
      }
    }
    return null;
  }, []);

  // Parse form values from URL search params or session storage
  const formValuesFromURL = useMemo(() => {
    // First try to get from URL search params
    const genre = searchParams.get("genre");
    const nearest_station = searchParams.get("nearest_station");
    const is_favorite = searchParams.get("is_favorite") === "true";

    // If no search params in URL, try to get from session storage
    if (!genre && !nearest_station && !is_favorite) {
      const cachedData = getCachedData();
      if (cachedData?.searchParams) {
        return {
          genre: cachedData.searchParams.genre || undefined,
          nearest_station: cachedData.searchParams.nearest_station || undefined,
          is_favorite: cachedData.searchParams.is_favorite || undefined,
        };
      }
    }

    return {
      genre: genre || undefined,
      nearest_station: nearest_station || undefined,
      is_favorite: is_favorite || undefined,
    };
  }, [searchParams, getCachedData]);

  const filterVenues = useCallback(
    (venues: StockedVenue[], orderType: OrderTypeEnum) => {
      return venues.filter((venue) => {
        // Check if venue supports eat-in through either enable_eat_in or enable_reservation
        const hasEatIn =
          venue.venue_details.enable_eat_in ||
          venue.venue_details.enable_reservation ||
          false;

        const supportedOrderTypes = [
          hasEatIn ? OrderTypeEnum.DineIn : null,
          venue.venue_details.enable_take_out ? OrderTypeEnum.Takeout : null,
        ].filter(Boolean) as OrderTypeEnum[];

        return supportedOrderTypes.includes(orderType);
      });
    },
    []
  );

  /**
   * Fetches venues list with filters from search params and form
   */
  const fetchStockVenues = useCallback(async () => {
    try {
      setLoading(true);

      const formValues = form.getFieldsValue();
      const orderType = formValues.orderType || OrderTypeEnum.DineIn;

      const genre = formValuesFromURL.genre;
      const nearest_station = formValuesFromURL.nearest_station;
      const is_favorite = formValuesFromURL.is_favorite;

      const response = await getListStockVenues(
        genre || undefined,
        is_favorite ? is_favorite : undefined,
        nearest_station || undefined,
        orderType
      );
      const filteredVenues = filterVenues(response, orderType);
      setVenuesRaw(filteredVenues);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  }, [form, formValuesFromURL, filterVenues]);

  useEffect(() => {
    // Check sessionStorage for cached form values and timeSlotSelected
    const cachedData = getCachedData();

    if (cachedData) {
      // Restore form values from cache
      if (cachedData.formValues) {
        form.setFieldsValue(cachedData.formValues);
      }

      // Restore selected time slot from cache
      if (cachedData.timeSlotSelected) {
        setTimeSlotSelected(cachedData.timeSlotSelected);
      }
    }

    // Always fetch fresh data from API
    fetchStockVenues();
  }, [fetchStockVenues, form, getCachedData]);

  // Generate timeslots from venues
  useEffect(() => {
    if (!isEmpty(venuesRaw)) {
      const startTime = getStartTimeFromVenues(venuesRaw);
      if (startTime) {
        const slots = generateTimeslotsFrom(startTime);
        setTimeSlotsFiltered(slots);

        if (!timeSlotSelected) {
          setTimeSlotSelected(slots[0]);
        } else {
          // Check if the cached timeSlotSelected is still valid in the new slots
          const cachedSlotExists = slots.find(
            (slot) => slot.id === timeSlotSelected.id
          );
          if (!cachedSlotExists) {
            // If cached slot is no longer valid, select the first available slot
            isInitialLoadRef.current = true;
            setTimeSlotSelected(slots[0]);
          }
        }
      } else {
        setTimeSlotsFiltered([]);
        setTimeSlotSelected(null);
      }
    } else {
      setTimeSlotsFiltered([]);
    }
  }, [venuesRaw]);

  useEffect(() => {
    if (timeSlotSelected?.id && !isEmpty(venuesRaw)) {
      const venuesFiltered = venuesRaw.filter((venue) => {
        const matchingVenueTimeSlot = findSatisfyingVenueTimeslot(
          venue,
          timeSlotSelected
        );
        return matchingVenueTimeSlot !== null;
      });
      setVenuesFiltered(venuesFiltered);
    } else {
      setVenuesFiltered([]);
    }
  }, [timeSlotSelected, venuesRaw]);

  /**
   * Handles form filter changes and refetches venues
   */
  const handleFilterChange = useCallback(() => {
    // Clear cache when user changes filter
    sessionStorage.removeItem(STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY);
    // Reset timeSlotSelected when filter changes
    setTimeSlotsFiltered([]);
    setTimeSlotSelected(null);
    // Reset to initial load state for instant scrolling
    isInitialLoadRef.current = true;
    fetchStockVenues();
  }, [fetchStockVenues]);

  /**
   * Handles navigation to MenuPage with orderType and timeSlot
   */
  const handleNavigateToMenu = useCallback(
    (venueId: string) => {
      const orderTypeFromForm = form.getFieldValue("orderType");

      // Find the venue to get its actual timeslot ID
      const venue = venuesRaw.find((v) => v.venue_details.id === venueId);
      let actualTimeSlotId = timeSlotSelected?.id;

      if (venue && timeSlotSelected) {
        // Find the venue's timeslot that matches the selected time
        const matchingVenueTimeSlot = findSatisfyingVenueTimeslot(
          venue,
          timeSlotSelected
        );

        if (matchingVenueTimeSlot) {
          actualTimeSlotId = matchingVenueTimeSlot.id;
        }
      }

      // Save state to sessionStorage instead of location.state
      const stockVenueState = {
        venues: venuesRaw,
        formValues: { orderType: orderTypeFromForm },
        searchParams: formValuesFromURL,
        timeSlotSelected: timeSlotSelected,
        timestamp: Date.now(),
      };

      sessionStorage.setItem(
        STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY,
        JSON.stringify(stockVenueState)
      );

      navigate(
        `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}?from=${STOCK_VENUE_AVAILABLE_STATE.FROM_PARAM}`,
        {
          state: {
            orderType: orderTypeFromForm,
            timeSlot: actualTimeSlotId,
          },
        }
      );
    },
    [form, navigate, venuesRaw, formValuesFromURL, timeSlotSelected]
  );

  // Function to scroll selected time slot into view
  const scrollToSelectedTimeSlot = useCallback(
    (selectedTimeSlotId: string, behavior: ScrollBehavior = "smooth") => {
      if (!timeSlotContainerRef.current || !selectedTimeSlotId) return;

      const selectedSlotElement = timeSlotRefs.current[selectedTimeSlotId];
      if (!selectedSlotElement) return;

      const container = timeSlotContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = selectedSlotElement.getBoundingClientRect();

      const elementCenter = elementRect.left + elementRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollOffset = elementCenter - containerCenter;

      container.scrollTo({
        left: container.scrollLeft + scrollOffset,
        behavior: behavior,
      });
    },
    []
  );

  // Effect to scroll to selected time slot when it changes
  useEffect(() => {
    if (timeSlotSelected?.id && timeSlotsFiltered.length > 0) {
      // Use instant behavior for initial load, smooth for user interactions
      const behavior = isInitialLoadRef.current ? "instant" : "smooth";
      scrollToSelectedTimeSlot(timeSlotSelected.id, behavior);

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, [timeSlotSelected?.id, timeSlotsFiltered, scrollToSelectedTimeSlot]);

  // Function to update session storage with current state
  const updateSessionStorage = useCallback(() => {
    const cachedState = sessionStorage.getItem(
      STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY
    );

    if (cachedState) {
      try {
        const parsedState = JSON.parse(cachedState);
        const updatedState = {
          ...parsedState,
          timeSlotSelected: timeSlotSelected,
          timestamp: Date.now(),
        };

        sessionStorage.setItem(
          STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY,
          JSON.stringify(updatedState)
        );
      } catch (error) {
        console.error("Error updating session storage:", error);
      }
    }
  }, [timeSlotSelected]);

  // Update session storage when timeSlotSelected changes
  useEffect(() => {
    if (timeSlotSelected && timeSlotsFiltered.length > 0) {
      updateSessionStorage();
    }
  }, [timeSlotSelected, timeSlotsFiltered, updateSessionStorage]);

  // Handler for time slot selection with smooth scrolling
  const handleTimeSlotClick = (timeSlot: { id: string; time: string }) => {
    isInitialLoadRef.current = false;
    setTimeSlotSelected(timeSlot);
  };

  return (
    <>
      <SEOHeadData
        title={`${t("share.stock_venue_available_title")} | Omochi`}
        description={t("share.stock_venue_available_title")}
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
            title={t("share.stock_venue_available_title")}
            onBack={() => {
              // Clear current cache to force StockStoresPage to load from its cache
              sessionStorage.removeItem(
                STOCK_VENUE_AVAILABLE_STATE.SESSION_STORAGE_KEY
              );

              navigate(
                `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.STOCK_STORE}`
              );
            }}
          />

          {/* H1 for SEO - Page title */}
          <Title
            level={1}
            className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
            style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
          >
            {t("share.stock_venue_available_title")} - Omochi
          </Title>

          <div className="flex flex-col flex-1 gap-4 px-4 w-full scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth">
            {/* Form Filter */}
            <Form
              form={form}
              name="stockStore"
              layout="horizontal"
              requiredMark={false}
              className="!w-full !flex !items-center !gap-2"
              onValuesChange={handleFilterChange}
            >
              <Form.Item
                name="orderType"
                className="!m-0 form-item-select-middle flex-1"
                initialValue={OrderTypeEnum.DineIn}
              >
                <SelectInput
                  placeholder={t("order.label.order_method_label")}
                  options={orderTypeOptions}
                  size="middle"
                  className="!text-white placeholder-fix"
                  popupClassName="!bg-[var(--background-color)] !text-white"
                  rootClassName="custom-select"
                />
              </Form.Item>
            </Form>

            <div className="flex flex-col flex-1">
              {/* List timeslot */}
              <div
                ref={timeSlotContainerRef}
                className="!bg-[var(--background-color)] pb-4 z-[2] sticky top-0 flex flex-row gap-1 w-full overflow-x-scroll scrollbar-hidden scroll-smooth min-h-[38px]"
              >
                {timeSlotsFiltered.map((ts) => {
                  const isSelected = ts.id === timeSlotSelected?.id;
                  return (
                    <div
                      key={ts.id}
                      ref={(el) => {
                        timeSlotRefs.current[ts.id] = el;
                      }}
                    >
                      <CustomTag
                        label={`${ts.time} ～`}
                        color={isSelected ? "#009688" : "#383838"}
                        onClick={() => handleTimeSlotClick(ts)}
                        className={`${
                          isSelected ? "!font-bold" : "!font-normal"
                        } !px-[10px]`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Stock Venues Available Content */}
              <div className="flex flex-col w-full gap-4 scrollbar-hidden overflow-y-auto scroll-smooth h-full">
                {!loading && venuesFiltered.length === 0 ? (
                  <div className="flex-grow flex items-center justify-center h-full">
                    <p className="text-white text-center">
                      {t("general.no_data")}
                    </p>
                  </div>
                ) : (
                  venuesFiltered.map((store) => {
                    if (!timeSlotSelected) return null;

                    const matchingVenueTimeSlot = findSatisfyingVenueTimeslot(
                      store,
                      timeSlotSelected
                    );

                    if (!matchingVenueTimeSlot) {
                      return null;
                    }

                    return (
                      <div
                        key={store.id}
                        id={`store-${store.venue_details.id}`}
                      >
                        <CardStockVenueAvailable
                          venueDetail={store.venue_details}
                          timeSlot={matchingVenueTimeSlot}
                          onClick={() =>
                            handleNavigateToMenu(store.venue_details.id)
                          }
                          orderType={form.getFieldValue("orderType")}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* <!-- ads_bottom --> */}

          <div className="!px-4 !w-full !max-w-[500px]">
            <GoogleAds
              adClient={import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID}
              adSlot={import.meta.env.VITE_ADS_SLOT_STOCK_VENUE_AVAILABLE}
            />
          </div>
        </div>
      </Spin>
    </>
  );
});

export default StockVenueAvailablePage;
