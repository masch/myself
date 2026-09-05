/**
 * Standard business error codes for cross-platform client/server communication.
 * Allows frontend and mobile clients to react deterministically to specific error conditions.
 */
export const ErrorCode = {
  // Generic / Transport
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",

  // Domain Specific
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  ENTITY_NOT_FOUND: "ENTITY_NOT_FOUND",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
