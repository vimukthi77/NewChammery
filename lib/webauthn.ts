/**
 * Helper to dynamically determine the WebAuthn Relying Party ID (rpID) and Origin
 * for both local development (localhost) and production (e.g. new-chammery.vercel.app).
 */
export function getWebAuthnConfig(
  req: Request,
  clientHostname?: string,
  clientOrigin?: string
) {
  // 1. If client sent its browser hostname (e.g. window.location.hostname)
  if (clientHostname && typeof clientHostname === 'string') {
    const cleanClientHost = clientHostname.trim().toLowerCase();
    if (/^[a-z0-9.-]+$/.test(cleanClientHost)) {
      const origin =
        clientOrigin ||
        (cleanClientHost === 'localhost'
          ? 'http://localhost:3000'
          : `https://${cleanClientHost}`);
      return {
        rpID: cleanClientHost,
        origin,
      };
    }
  }

  // 2. Extract from request headers
  const xForwardedHost = req.headers.get('x-forwarded-host');
  const hostHeader = req.headers.get('host');
  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');

  let rawHost = xForwardedHost || hostHeader || '';

  // If host contains localhost, check origin / referer for production domain
  if (!rawHost || rawHost.includes('localhost')) {
    if (originHeader) {
      try {
        const u = new URL(originHeader);
        if (u.hostname && !u.hostname.includes('localhost')) {
          rawHost = u.hostname;
        }
      } catch {}
    } else if (refererHeader) {
      try {
        const u = new URL(refererHeader);
        if (u.hostname && !u.hostname.includes('localhost')) {
          rawHost = u.hostname;
        }
      } catch {}
    }
  }

  // If on Vercel and rawHost is still missing or localhost
  if ((!rawHost || rawHost.includes('localhost')) && process.env.VERCEL_URL) {
    rawHost = process.env.VERCEL_URL.replace(/^https?:\/\//, '');
  }

  // Fallback to production domain if in production
  if ((!rawHost || rawHost.includes('localhost')) && process.env.NODE_ENV === 'production') {
    rawHost = 'new-chammery.vercel.app';
  }

  const cleanHost = (rawHost || 'localhost').split(':')[0];

  // Check if RP_ID is explicitly configured in env and NOT 'localhost'
  let rpID = cleanHost;
  if (process.env.RP_ID && process.env.RP_ID !== 'localhost') {
    rpID = process.env.RP_ID;
  }

  // Derive origin
  let origin = originHeader;
  if (!origin) {
    const proto =
      req.headers.get('x-forwarded-proto') || (cleanHost === 'localhost' ? 'http' : 'https');
    const port =
      hostHeader?.includes(':3000') && cleanHost === 'localhost' ? ':3000' : '';
    origin = `${proto}://${cleanHost}${port}`;
  }

  return { rpID, origin };
}

