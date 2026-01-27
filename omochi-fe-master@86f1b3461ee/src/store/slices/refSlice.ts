import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REF_SLICE } from "../../utils/constants";

interface RefItem {
  refCode: string;
  timestamp: number;
}

interface RefState {
  [venueId: string]: RefItem[];
}

// Get ref data from localStorage if available
const loadRefFromStorage = (): RefState => {
  try {
    const refData = localStorage.getItem(REF_SLICE);
    if (refData) {
      return JSON.parse(refData);
    }
  } catch (error) {
    console.error("Error loading ref data from localStorage:", error);
  }
  return {};
};

// Helper function to save refs to localStorage
const saveRefsToStorage = (state: RefState) => {
  try {
    localStorage.setItem(REF_SLICE, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving ref data to localStorage:", error);
  }
};

// Initialize state from localStorage
const initialState: RefState = loadRefFromStorage();

const refSlice = createSlice({
  name: "ref",
  initialState,
  reducers: {
    addRefToVenue: (
      state,
      action: PayloadAction<{ venueId: string; refCode: string }>
    ) => {
      const { venueId, refCode } = action.payload;

      if (!state[venueId]) {
        state[venueId] = [];
      }

      // Check if refCode already exists in this venue
      const existingIndex = state[venueId].findIndex(
        (item) => item.refCode === refCode
      );

      if (existingIndex === -1) {
        // Only add if refCode doesn't exist
        state[venueId].push({
          refCode,
          timestamp: Date.now(),
        });
      }
      // If refCode already exists, do nothing (skip)

      saveRefsToStorage(state);
    },

    removeRefFromVenue: (
      state,
      action: PayloadAction<{ venueId: string; refCode: string }>
    ) => {
      const { venueId, refCode } = action.payload;
      if (state[venueId]) {
        state[venueId] = state[venueId].filter(
          (item) => item.refCode !== refCode
        );

        // Remove venue if no refs left
        if (state[venueId].length === 0) {
          delete state[venueId];
        }
      }

      saveRefsToStorage(state);
    },

    setRefsForVenue: (
      state,
      action: PayloadAction<{ venueId: string; refCodes: string[] }>
    ) => {
      const { venueId, refCodes } = action.payload;

      if (refCodes.length === 0) {
        delete state[venueId];
      } else {
        // Convert string array to RefItem array with current timestamp
        state[venueId] = refCodes.map((refCode) => ({
          refCode,
          timestamp: Date.now(),
        }));
      }

      saveRefsToStorage(state);
    },

    removeVenue: (state, action: PayloadAction<string>) => {
      const venueId = action.payload;
      delete state[venueId];
      saveRefsToStorage(state);
    },

    addMultipleRefsToVenue: (
      state,
      action: PayloadAction<{ venueId: string; refCodes: string[] }>
    ) => {
      const { venueId, refCodes } = action.payload;

      if (!state[venueId]) {
        state[venueId] = [];
      }

      const currentTime = Date.now();

      // Add only unique refCodes that don't exist yet
      refCodes.forEach((refCode) => {
        const existingIndex = state[venueId].findIndex(
          (item) => item.refCode === refCode
        );

        if (existingIndex === -1) {
          // Only add if refCode doesn't exist
          state[venueId].push({
            refCode,
            timestamp: currentTime,
          });
        }
        // If refCode already exists, skip it
      });

      saveRefsToStorage(state);
    },

    setAllVenues: (state, action: PayloadAction<RefState>) => {
      // Clear current state and set new state
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, action.payload);
      saveRefsToStorage(state);
    },

    clearAllRefs: (state) => {
      // Clear all properties
      Object.keys(state).forEach((key) => delete state[key]);
      try {
        localStorage.removeItem(REF_SLICE);
      } catch (error) {
        console.error("Error removing ref data from localStorage:", error);
      }
    },
  },
});

// Selector helpers
export const selectAllVenues = (state: { ref: RefState }) => state.ref;

export const selectRefCodesByVenue =
  (venueId: string) => (state: { ref: RefState }) =>
    (state.ref[venueId] || []).map((item) => item.refCode);

export const selectVenueIds = (state: { ref: RefState }) =>
  Object.keys(state.ref);

export const selectHasRefsForVenue =
  (venueId: string) => (state: { ref: RefState }) =>
    !!(state.ref[venueId] && state.ref[venueId].length > 0);

// New selectors for timestamp-based queries
export const selectLatestRefByVenue =
  (venueId: string) => (state: { ref: RefState }) => {
    const refs = state.ref[venueId];
    if (!refs || refs.length === 0) return null;

    return refs.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  };

export const selectLatestRefGlobally = (state: {
  ref: RefState;
}): { refCode: string; venueId: string; timestamp: number } | null => {
  const venues = state.ref;
  let globalLatest: {
    refCode: string;
    venueId: string;
    timestamp: number;
  } | null = null;

  for (const venueId in venues) {
    const refs = venues[venueId];
    if (refs && refs.length > 0) {
      const venueLatest = refs.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
      );

      if (!globalLatest || venueLatest.timestamp > globalLatest.timestamp) {
        globalLatest = {
          refCode: venueLatest.refCode,
          venueId,
          timestamp: venueLatest.timestamp,
        };
      }
    }
  }

  return globalLatest;
};

export const selectVenueByRefCode =
  (refCode: string) =>
  (state: { ref: RefState }): string | null => {
    const venues = state.ref;

    for (const venueId in venues) {
      const refs = venues[venueId];
      const found = refs.find((item) => item.refCode === refCode);
      if (found) {
        return venueId;
      }
    }

    return null; // RefCode not found in any venue
  };

export const {
  addRefToVenue,
  removeRefFromVenue,
  setRefsForVenue,
  removeVenue,
  addMultipleRefsToVenue,
  setAllVenues,
  clearAllRefs,
} = refSlice.actions;

export default refSlice.reducer;
export type { RefState, RefItem };
