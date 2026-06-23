const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface SessionResponse {
  token: string;
  user: AuthUser;
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${AUTH_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Auth error ${resp.status}`);
  }

  return resp.json();
}

export async function signIn(email: string, password: string): Promise<SessionResponse> {
  return authFetch<SessionResponse>("/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(email: string, password: string, name: string): Promise<SessionResponse> {
  return authFetch<SessionResponse>("/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await authFetch("/forget-password", {
    method: "POST",
    body: JSON.stringify({ email, redirectTo: window.location.origin }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await authFetch("/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function getSession(token: string): Promise<SessionResponse | null> {
  try {
    const resp = await fetch("/api/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    return { token, user: body.user };
  } catch {
    return null;
  }
}
