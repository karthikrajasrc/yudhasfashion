export const SERVER_ERROR_MESSAGE = "An unexpected server error occurred";

export async function readApiResponse<T>(
  request: Response | Promise<Response>,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;
  try {
    response = await request;
  } catch {
    throw new Error(SERVER_ERROR_MESSAGE);
  }

  const result = (await response.json().catch(() => null)) as
    (T & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? SERVER_ERROR_MESSAGE
        : (result?.message ?? fallbackMessage),
    );
  }
  if (!result) throw new Error(SERVER_ERROR_MESSAGE);
  return result;
}
