interface OidcUserLike {
  access_token?: string;
  expires_at?: number;
  profile?: {
    sub?: string;
  };
}

const OIDC_USER_KEY_PREFIX = "oidc.user:";
const OIDC_AUTHORITY = "https://localhost:9443/oauth2/token/.well-known/openid-configuration";
const OIDC_CLIENT_ID = "WFhffPHFgieZhvY8421q0fdG7tga";
const EXPECTED_OIDC_USER_KEY = `${OIDC_USER_KEY_PREFIX}${OIDC_AUTHORITY}:${OIDC_CLIENT_ID}`;

const parseOidcUser = (raw: string | null): OidcUserLike | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OidcUserLike;
  } catch {
    return null;
  }
};

const hasUsableAccessToken = (user: OidcUserLike | null): user is OidcUserLike & { access_token: string } =>
  typeof user?.access_token === "string" && user.access_token.trim().length > 0;

const isNotExpired = (user: OidcUserLike): boolean => {
  if (typeof user.expires_at !== "number" || user.expires_at <= 0) return true;
  return user.expires_at > Math.floor(Date.now() / 1000);
};

export const getOidcAccessTokenFromSession = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const expectedUser = parseOidcUser(sessionStorage.getItem(EXPECTED_OIDC_USER_KEY));
    if (hasUsableAccessToken(expectedUser) && isNotExpired(expectedUser)) {
      return expectedUser.access_token;
    }

    const candidates: OidcUserLike[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(OIDC_USER_KEY_PREFIX)) continue;

      const parsed = parseOidcUser(sessionStorage.getItem(key));
      if (hasUsableAccessToken(parsed) && isNotExpired(parsed)) {
        candidates.push(parsed);
      }
    }

    candidates.sort((a, b) => (b.expires_at ?? 0) - (a.expires_at ?? 0));
    return candidates[0]?.access_token?.trim() || null;
  } catch {
    return null;
  }

  return null;
};

export const clearOidcUserSessionEntries = (): void => {
  if (typeof window === "undefined") return;

  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(OIDC_USER_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
};
