/**
 * Drop-in replacement for `fetch` that automatically injects `x-client-id`.
 * The client ID is a UUID stored in localStorage, generated on first visit.
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const clientId = typeof window !== "undefined"
    ? window.localStorage.getItem("hotpot-client-id") ?? ""
    : "";

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(clientId ? { "x-client-id": clientId } : {}),
    },
  });
}
