import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { getMe } from "../api/auth";
import { setUser, logout } from "../store/slices/authSlice";
import { setAuthLoading } from "../store/slices/uiSlice";
import { AUTH, USER_ROLE, VENUE_ROLE } from "../utils/constants";

export const useAuth = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (initialized.current) return;
      initialized.current = true;

      try {
        const authData = localStorage.getItem(AUTH);
        if (!authData) {
          setIsLoading(false);
          return;
        }

        const { accessToken } = JSON.parse(authData);
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        dispatch(setAuthLoading(true));

        const user = await getMe();
        const userWithRole = {
          ...user,
          role: user.venue_roles.length > 0 ? VENUE_ROLE : USER_ROLE,
        };
        dispatch(setUser(userWithRole));
      } catch (error) {
        console.error("Error initializing auth:", error);
        dispatch(logout());
      } finally {
        setIsLoading(false);
        dispatch(setAuthLoading(false));
      }
    };

    initializeAuth();
  }, [dispatch]);

  return { isLoading };
};
