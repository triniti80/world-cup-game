export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
};

export type SessionResponse =
  | { authenticated: true; user: SessionUser }
  | { authenticated: false; user: null };

export type Fixture = {
  id: string;
  number: number;
  stage: string;
  group: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  kickoffAtUtc: string;
  venue: string;
  status: "scheduled" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
};

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

type ApiErrorBody = {
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}.`);
  }

  return body;
}

export function getSession() {
  return request<SessionResponse>("/api/session");
}

export function login(email: string, password: string) {
  return request<{ ok: true }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload: {
  name: string;
  email: string;
  password: string;
  inviteCode?: string;
}) {
  return request<{ ok: true }>("/api/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request<{ ok: true }>("/api/logout", { method: "POST" });
}

export function getFixtures() {
  return request<{ matches: Fixture[] }>("/api/mobile/fixtures");
}
