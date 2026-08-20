function apiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
  return raw.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

export async function preflightEmailChange(accessToken: string, email: string) {
  const response = await fetch(`${apiBaseUrl()}/api/v1/users/me/email-change/preflight`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  const result = await response.json().catch(() => null) as { email?: string; allowed?: boolean; message?: string } | null;
  if (!response.ok) throw new Error(result?.message ?? 'Unable to validate the new email address.');
  if (!result?.allowed || !result.email) throw new Error('Unable to validate the new email address.');
  return result.email;
}
