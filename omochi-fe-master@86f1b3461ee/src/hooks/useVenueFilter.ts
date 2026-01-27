import { useMemo } from "react";
import { StockedVenue } from "@/generated/api";
import { isEmpty } from "@/utils/helper";
import { useTranslation } from "react-i18next";

interface FilterOptions {
  value: string;
  label: string;
}

interface FilterValues {
  genre?: string;
  nearest_station?: string;
  is_favorite?: boolean;
}

interface UseVenueFilterResult {
  filteredVenues: StockedVenue[];
  genreFilterOptions: FilterOptions[];
  stationFilterOptions: FilterOptions[];
}

/**
 * Custom hook for client-side venue filtering
 * Much simpler approach - filter on client instead of multiple API calls
 *
 * @param allVenues - Complete array of venues (fetched once)
 * @param filters - Current filter values to apply
 * @returns Object containing filtered venues and filter options
 */
export const useVenueFilter = (
  allVenues: StockedVenue[],
  filters: FilterValues = {}
): UseVenueFilterResult => {
  const { t } = useTranslation();
  // Client-side filtering based on current filter values
  const filteredVenues = useMemo(() => {
    if (!allVenues.length) return [];

    return allVenues.filter((venue) => {
      if (isEmpty(venue.venue_details)) return false;

      // Filter by genre
      if (filters.genre && venue.venue_details.genre !== filters.genre) {
        return false;
      }

      // Filter by nearest station
      if (
        filters.nearest_station &&
        venue.venue_details.nearest_station !== filters.nearest_station
      ) {
        return false;
      }

      // Filter by favorite status
      if (filters.is_favorite === true && !venue.is_favorite) {
        return false;
      }

      return true;
    });
  }, [allVenues, filters]);

  // Generate genre options from ALL venues (not filtered)
  const genreFilterOptions = useMemo(() => {
    if (!allVenues.length)
      return [{ value: "", label: t("order.label.order_method_all_label") }];

    const uniqueGenres = Array.from(
      new Set(
        allVenues
          .map((venue) => venue.venue_details.genre)
          .filter(
            (genre): genre is string =>
              genre !== null && genre !== undefined && genre.trim() !== ""
          )
      )
    ).sort();

    return [
      { value: "", label: t("order.label.order_method_all_label") },
      ...uniqueGenres.map((genre) => ({
        value: genre,
        label: genre,
      })),
    ];
  }, [allVenues, t]);

  // Generate station options from ALL venues (not filtered)
  const stationFilterOptions = useMemo(() => {
    if (!allVenues.length)
      return [{ value: "", label: t("order.label.order_method_all_label") }];

    const uniqueStations = Array.from(
      new Set(
        allVenues
          .map((venue) => venue.venue_details.nearest_station)
          .filter(
            (station): station is string =>
              station !== null && station !== undefined && station.trim() !== ""
          )
      )
    ).sort();

    return [
      { value: "", label: t("order.label.order_method_all_label") },
      ...uniqueStations.map((station) => ({
        value: station,
        label: station,
      })),
    ];
  }, [allVenues, t]);

  return {
    filteredVenues,
    genreFilterOptions,
    stationFilterOptions,
  };
};
