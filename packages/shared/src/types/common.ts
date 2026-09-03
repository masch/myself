import type { ErrorCode } from "../constants/errors";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
}

export const APP_NAME = "myself";
