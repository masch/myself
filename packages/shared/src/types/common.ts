export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const APP_NAME = "myself";
