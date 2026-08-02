const PRIVATE_IP_RE =
  /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::ffff:127\.)/;

/**
 * Extract the real client IP from a request.
 * Railway (and most reverse proxies) rewrites X-Forwarded-For with the
 * actual client IP as the leftmost entry, so we prefer that over req.ip
 * which can still be a proxy address when trust-proxy hop count is wrong.
 */
export function getRealIp(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const first = (Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim();
    if (first) return first;
  }
  return req.ip ?? null;
}

export async function geoLookup(
  ip: string | null | undefined,
): Promise<{ country: string | null; city: string | null }> {
  if (!ip || PRIVATE_IP_RE.test(ip)) return { country: null, city: null };
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city`,
      { signal: AbortSignal.timeout(3000) },
    );
    const data = (await res.json()) as {
      status: string;
      country?: string;
      city?: string;
    };
    if (data.status !== "success") return { country: null, city: null };
    return { country: data.country ?? null, city: data.city ?? null };
  } catch {
    return { country: null, city: null };
  }
}
