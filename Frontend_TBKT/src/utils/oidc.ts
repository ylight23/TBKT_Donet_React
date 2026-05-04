interface OidcUserLike {
  access_token?: string;
}

const OIDC_USER_KEY_PREFIX = "oidc.user:";

export const getOidcAccessTokenFromSession = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(OIDC_USER_KEY_PREFIX)) continue;

      const raw = sessionStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as OidcUserLike;
      if (typeof parsed.access_token === "string" && parsed.access_token.trim()) {
        return parsed.access_token;
      }
    }
  } catch {
    return null;
  }

  return null;
};
