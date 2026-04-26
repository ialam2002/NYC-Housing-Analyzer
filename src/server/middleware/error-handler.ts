export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createErrorResponse(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown>) {
  return {
    response: {
      data: null,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    status,
  };
}

export function logSafeError(endpoint: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`${endpoint} error`, {
    message: errorMessage,
    stack: errorStack,
  });
}

