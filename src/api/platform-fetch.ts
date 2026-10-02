/** Platform transport. Feature code must not call `fetch`; the lint rule allows it only here. */
export function platformFetch(input: Request): Promise<Response> {
  return fetch(input);
}

/** Adds a bearer token without replacing the headers the generated client already set. */
export function withAuthorization(
  accessToken: string,
  fetchImpl: (input: Request) => Promise<Response> = platformFetch,
): (input: Request) => Promise<Response> {
  return (input) => {
    const headers = new Headers(input.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetchImpl(new Request(input, { headers }));
  };
}
