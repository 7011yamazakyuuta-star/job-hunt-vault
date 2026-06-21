export type ApiUser = {
  id: string;
  email: string;
  name: string;
  googlePictureUrl: string | null;
};

export type ApiRoom = {
  id: string;
  roomCode: string;
  name: string;
  type: "personal" | "shared";
};

export type ApiRoomListItem = {
  id: string;
  room_code: string;
  name: string;
  type: "personal" | "shared";
  join_enabled: 0 | 1;
  role: "owner" | "member";
  joined_at: string;
};

export type ApiCompany = {
  id: string;
  name: string;
  name_kana: string | null;
  domain: string | null;
  industry: string | null;
  priority_deadline_at: string | null;
  ticker: string | null;
  exchange: string | null;
  career_url: string | null;
  mypage_url: string | null;
  logo_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyCreateInput = {
  name: string;
  nameKana?: string;
  domain?: string;
  industry?: string;
  priorityDeadlineAt?: string;
  ticker?: string;
  exchange?: string;
  careerUrl?: string;
  mypageUrl?: string;
  logoUrl?: string;
  memo?: string;
};

export type LogoSearchResult = {
  name: string;
  domain: string;
  logoUrl: string;
};

export type LogoSearchResponse = {
  status: "ok" | "provider-unconfigured";
  provider: {
    name: "logo.dev";
    mode: "brand-search";
    secretKeyConfigured: boolean;
  };
  results: LogoSearchResult[];
};

export type CatalogCompany = {
  id: string;
  source: string;
  source_id: string | null;
  country: string;
  name: string;
  name_kana: string | null;
  normalized_name: string;
  domain: string | null;
  industry: string | null;
  market: string | null;
  ticker: string | null;
  exchange: string | null;
  logo_url: string | null;
  updated_at: string;
};

export type CatalogSearchResponse = {
  companies: CatalogCompany[];
  status: "ok" | "empty";
};

export type ApiTestReport = {
  id: string;
  test_type_id: string | null;
  source: string | null;
  notes: string | null;
  visibility: "room" | "private";
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type TestReportCreateInput = {
  companyId: string;
  testTypeId?: string;
  source?: string;
  notes?: string;
  visibility: "room" | "private";
};

export type ApiVaultItem = {
  id: string;
  application_id: string | null;
  encrypted_payload: string;
  created_at: string;
  updated_at: string;
};

export type VaultItemCreateInput = {
  applicationId?: string;
  encryptedPayload: string;
};

export async function getMe(): Promise<{ user: ApiUser | null }> {
  return apiGet("/api/me");
}

export async function getHealth(): Promise<{ ok: boolean; service: string; time: string }> {
  return apiGet("/api/health");
}

export async function createPersonalRoom(input: { name: string; displayName?: string }): Promise<{ room: ApiRoom }> {
  return apiPost("/api/rooms/personal", input);
}

export async function listRooms(): Promise<{ rooms: ApiRoomListItem[] }> {
  return apiGet("/api/rooms");
}

export async function createSharedRoom(input: {
  name: string;
  passphrase: string;
  displayName?: string;
}): Promise<{ room: ApiRoom }> {
  return apiPost("/api/rooms", input);
}

export async function joinRoom(input: {
  roomCode?: string;
  roomId?: string;
  passphrase: string;
  displayName?: string;
}): Promise<{ roomId: string; joined: boolean }> {
  return apiPost("/api/rooms/join", input);
}

export async function listRoomCompanies(
  roomId: string,
  options: { industry?: string; sort?: "deadline" | "kana" | "industry" } = {},
): Promise<{ companies: ApiCompany[] }> {
  const params = new URLSearchParams();
  if (options.industry && options.industry !== "all") {
    params.set("industry", options.industry);
  }
  if (options.sort) {
    params.set("sort", options.sort);
  }
  const query = params.toString();
  return apiGet(`/api/rooms/${encodeURIComponent(roomId)}/companies${query ? `?${query}` : ""}`);
}

export async function createCompany(roomId: string, input: CompanyCreateInput): Promise<{ companyId: string }> {
  return apiPost(`/api/rooms/${encodeURIComponent(roomId)}/companies`, input);
}

export async function searchLogoCandidates(query: string): Promise<LogoSearchResponse> {
  const params = new URLSearchParams({ q: query, strategy: "suggest" });
  return apiGet(`/api/logo/search?${params.toString()}`);
}

export async function searchCompanyCatalog(query: string): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  return apiGet(`/api/company-catalog/search?${params.toString()}`);
}

export async function listTestReports(roomId: string, companyId: string): Promise<{ testReports: ApiTestReport[] }> {
  return apiGet(
    `/api/rooms/${encodeURIComponent(roomId)}/companies/${encodeURIComponent(companyId)}/test-reports`,
  );
}

export async function createTestReport(
  roomId: string,
  input: TestReportCreateInput,
): Promise<{ testReportId: string }> {
  return apiPost(`/api/rooms/${encodeURIComponent(roomId)}/test-reports`, input);
}

export async function listVaultItems(roomId: string): Promise<{ credentialItems: ApiVaultItem[] }> {
  return apiGet(`/api/rooms/${encodeURIComponent(roomId)}/vault/items`);
}

export async function createVaultItem(
  roomId: string,
  input: VaultItemCreateInput,
): Promise<{ credentialItemId: string }> {
  return apiPost(`/api/rooms/${encodeURIComponent(roomId)}/vault/items`, input);
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest(path);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest(path, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json() as Promise<T>;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}
