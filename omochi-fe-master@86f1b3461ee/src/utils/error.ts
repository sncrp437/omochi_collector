export const hasResponse = (error: unknown): error is { response: unknown } => {
  return error !== null && typeof error === "object" && "response" in error;
};

export const isResponseObject = (response: unknown): response is { status: number } => {
  return response !== null && typeof response === "object" && "status" in response;
};

export const isUnauthorizedError = (error: unknown): error is { response: { status: number } } => {
  if (!hasResponse(error)) return false;
  if (!isResponseObject(error.response)) return false;
  return error.response.status === 401;
};

export const isNetworkError = (error: unknown): error is Error => {
  return error instanceof Error && error.message === "NETWORK_ERROR";
}; 