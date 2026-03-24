import { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

export const authConfig: AuthProviderProps = {
  // OIDC Authority (WSO2 IS)
  authority: "https://localhost:9443/oauth2/token/.well-known/openid-configuration",

  // Client ID registered in WSO2
  client_id: "WFhffPHFgieZhvY8421q0fdG7tga",
  // client_id: "9yGgAMZms7tegx5WJRsYiOvtWK0a",

  // Redirect URIs
  redirect_uri: "http://localhost:3001",
  post_logout_redirect_uri: "http://localhost:3001/login",  // No query params

  // Use main redirect_uri for silent renew to avoid callback.not.match error
  // silent_redirect_uri: "http://localhost:3001/silent-renew.html",
  silent_redirect_uri: "http://localhost:3001",

  // Scopes
  scope: "openid profile email",

  // Response type
  response_type: "code",

  // Use sessionStorage instead of localStorage
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Token validation
  validateSubOnSilentRenew: false,

  // Metadata (override automatic discovery if needed)
  metadata: {
    issuer: "https://localhost:9443/oauth2/token",
    authorization_endpoint: "https://localhost:9443/oauth2/authorize",
    token_endpoint: "https://localhost:9443/oauth2/token",
    userinfo_endpoint: "https://localhost:9443/oauth2/userinfo",
    end_session_endpoint: "https://localhost:9443/oidc/logout",
    check_session_iframe: "https://localhost:9443/oidc/checksession?client_id=WFhffPHFgieZhvY8421q0fdG7tga&redirect_uri=http%3A%2F%2Flocalhost%3A3001",
    //check_session_iframe: "https://localhost:9443/oidc/checksession?client_id=9yGgAMZms7tegx5WJRsYiOvtWK0a&redirect_uri=http%3A%2F%2Flocalhost%3A3001",
  },

  // Automatic silent renew (refresh tokens)
  automaticSilentRenew: true,

  // Load user info from userinfo endpoint
  loadUserInfo: true,

  // Enable built-in session monitoring using explicit check_session_iframe URL params
  monitorSession: true,

  // Events
  onSigninCallback: () => {
    // Clean up URL after signin
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
