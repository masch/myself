import type { ErrorCode } from "../constants/errors";

export interface ApiErrorResponse {
  error: string;
  code?: ErrorCode;
}

export const APP_NAME = "myself";
