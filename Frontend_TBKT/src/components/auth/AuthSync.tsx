import React, { useEffect, useRef } from 'react';
import { useAuth }     from "react-oidc-context";
import { useDispatch } from 'react-redux';
import { setAuth, logout } from '../../store/authReducer/auth';
import { setPermissions, clearPermissions } from '../../store/reducer/permissionReducer';
import { AppDispatch }     from '../../store';
import { safeSessionGet, safeSessionRemove } from '../../utils';
import { getMyPermissions } from '../../apis/phanQuyenApi';

const AuthSync: React.FC = () => {
    const auth     = useAuth();
    const dispatch = useDispatch<AppDispatch>();

    // ── Ref tránh dispatch logout khi OIDC đang loading ──────────────────────
    const hasAuthenticatedRef = useRef(false);

    // ── Force logout flag ─────────────────────────────────────────────────────
    useEffect(() => {
        const forceLogoutFlag = safeSessionGet<string>('force_logout');
        if (forceLogoutFlag === 'true') {
            safeSessionRemove('force_logout');
            dispatch(logout());

            dispatch(clearPermissions());

            auth.signoutRedirect().catch(() => {
                window.location.href = '/login?reason=revoked';
            });
        }
    // Rule: rerender-dependencies — auth.isAuthenticated (primitive) thay vì auth (object)
    }, [auth.isAuthenticated, dispatch]);

    // ── Sync auth state ───────────────────────────────────────────────────────
    useEffect(() => {
        // ✅ Bỏ qua khi đang loading
        if (auth.isLoading) return;

        const sync = async () => {
            try {
                if (auth.isAuthenticated && auth.user) {
                    hasAuthenticatedRef.current = true;  // ← đánh dấu đã auth thành công

                    const accessToken = auth.user.access_token;
                    const idToken     = auth.user.id_token;

                    const isValidJwt =
                        typeof accessToken === "string" &&
                        accessToken.trim().length > 0 &&
                        accessToken.split(".").length === 3;

                    if (!isValidJwt) {
                        console.warn("[AuthSync] ⚠️ Access token không phải JWT hợp lệ");
                    }

                    const { sub, preferred_username, name } = auth.user.profile;

                    dispatch(setAuth({
                        isAuthenticated: true,
                        accessToken:     accessToken || null,
                        idToken:         idToken     || null,
                        user:            preferred_username || sub || null,
                        currentUser:     { id: sub, name, username: preferred_username }
                    }));

                    // Fetch permissions sau khi auth thành công
                    try {
                        const perms = await getMyPermissions();
                        console.log('[AuthSync] Permissions loaded:', perms);
                        dispatch(setPermissions(perms));
                    } catch (e) {
                        console.error('[AuthSync] Không thể tải quyền:', e);
                    }

                } else if (!auth.isAuthenticated && !auth.isLoading) {
                    // ✅ Chỉ dispatch logout khi:
                    // 1. OIDC xác nhận không authenticated (không phải đang loading)
                    // 2. Chưa từng authenticated trong session này (tránh false positive khi navigate)
                    if (!hasAuthenticatedRef.current) {
                        dispatch(setAuth({
                            isAuthenticated: false,
                            accessToken:     null,
                            idToken:         null,
                            user:            null,
                            currentUser:     null,
                        }));
                    }
                    // ✅ Nếu đã từng authenticated → OIDC đang refresh token → không dispatch logout
                }
            } catch {
                // ✅ Chỉ dispatch logout khi chưa từng authenticated
                if (!hasAuthenticatedRef.current) {
                    dispatch(setAuth({
                        isAuthenticated: false,
                        accessToken:     null,
                        idToken:         null,
                        user:            null,
                        currentUser:     null,
                    }));
                }
            }
        };

        sync();
    }, [auth.isAuthenticated, auth.isLoading, auth.user, dispatch]);

    return null;
};

export default AuthSync;
