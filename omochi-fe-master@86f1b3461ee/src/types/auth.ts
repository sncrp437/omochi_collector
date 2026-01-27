import { User } from "../generated/api";

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  prefecture: string;
  city: string;
  address_detail: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: UserWithRole;
}
export interface UserWithRole extends User {
  role: string;
}

export interface StepResetPasswordData {
  id: number;
  content: string;
}
