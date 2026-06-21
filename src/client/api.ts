export type ApiUser = {
  id: string;
  email: string;
  name: string;
  googlePictureUrl: string | null;
};

export async function getMe(): Promise<{ user: ApiUser | null }> {
  return apiGet("/api/me");
}

export async function getHealth(): Promise<{ ok: boolean; service: string; time: string }> {
  return apiGet("/api/health");
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
