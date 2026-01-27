import {
  AuthApi,
  UserRegistrationRequest,
  UserProfileUpdateRequest,
  AddressRequest,
  PreferredLanguageEnum,
  PasswordChangeRequest,
} from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const authApi = new AuthApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const loginUser = async (email: string, password: string) => {
  const res = await authApi.login({
    email,
    password,
  });
  return res.data;
};

export const loginVenue = async (email: string, password: string) => {
  const res = await authApi.login2({
    email,
    password,
  });
  return res.data;
};

export const registerUser = async (
  userRegistrationRequest: UserRegistrationRequest
) => {
  const res = await authApi.registerUser(userRegistrationRequest);
  return res.data;
};

export const getMe = async () => {
  const res = await authApi.getUserProfile();
  return res.data;
};

export const updateProfile = async (userProfile: UserProfileUpdateRequest) => {
  const res = await authApi.authMeUpdate(userProfile);
  return res.data;
};

export const updateAddress = async (id: string, address: AddressRequest) => {
  const res = await authApi.authAddressesUpdate(id, address);
  return res.data;
};

export const refreshToken = async (refreshToken: string) => {
  const res = await authApi.authRefreshTokenCreate({
    refresh: refreshToken,
  });
  return res.data;
};

export const updatePreferredLanguage = async (
  language: PreferredLanguageEnum
) => {
  const res = await authApi.authPreferredLanguageUpdate({
    preferred_language: language,
  });
  return res.data;
};

export const updatePassword = async (
  passwordChangeRequest: PasswordChangeRequest
) => {
  const res = await authApi.changePassword(passwordChangeRequest);
  return res.data;
};

// request password reset
export const requestPasswordReset = async (email: string) => {
  const res = await authApi.authResetPasswordCreate({
    email,
  });
  return res.data;
};

// reset password confirm
export const resetPasswordConfirm = async (
  token: string,
  newPassword: string
) => {
  const res = await authApi.confirmPasswordReset({
    token,
    new_password: newPassword,
  });
  return res.data;
};
