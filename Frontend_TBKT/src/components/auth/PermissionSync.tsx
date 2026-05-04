import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store";
import { setPermissions, clearPermissions } from "../../store/reducer/permissionReducer";
import { getMyPermissions } from "../../apis/phanQuyenApi";

const PermissionSync: React.FC = () => {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      dispatch(clearPermissions());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const perms = await getMyPermissions();
        if (!cancelled) dispatch(setPermissions(perms));
      } catch (error) {
        if (!cancelled) {
          console.error("[PermissionSync] Failed to load permissions:", error);
          dispatch(clearPermissions());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.isLoading, dispatch]);

  return null;
};

export default PermissionSync;
