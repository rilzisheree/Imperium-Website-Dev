const PRIVATE_IP_RE =
  /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::ffff:127\.)/;

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
