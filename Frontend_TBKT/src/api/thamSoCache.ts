// ============================================================
// ThamSo cache service (localStorage only)
// - Không TTL
// - Không SWR
// - Invalidate theo sự kiện save/delete
// ============================================================

export const CACHE_VERSION = 'v1';

export const KEYS = {
  DYNAMIC_FIELDS: `thamso_dynamicfields_${CACHE_VERSION}`,
  FIELD_SETS: `thamso_fieldsets_${CACHE_VERSION}`,
  FORM_CONFIGS: `thamso_formconfigs_${CACHE_VERSION}`,
  APP_VERSION: 'thamso_app_version',
} as const;

const MODULE_KEYS: ReadonlyArray<string> = [
  KEYS.DYNAMIC_FIELDS,
  KEYS.FIELD_SETS,
  KEYS.FORM_CONFIGS,
  KEYS.APP_VERSION,
];

export const schemaCache = {
  /**
   * Đọc dữ liệu từ localStorage và parse JSON.
   * Nếu key không tồn tại hoặc parse lỗi -> trả về null.
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Ghi dữ liệu vào localStorage dưới dạng JSON string.
   */
  set<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  },

  /**
   * Xóa một key cache cụ thể.
   */
  clear(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * Xóa toàn bộ key thuộc module cache ThamSo.
   * Không đụng tới key của module khác.
   */
  clearAll(): void {
    MODULE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Kiểm tra version app để migrate cache:
   * - Nếu appVersion thay đổi so với lần chạy trước -> clear toàn bộ cache module
   * - Sau đó lưu appVersion mới
   */
  checkAndMigrateVersion(appVersion: string): void {
    const storedVersion = localStorage.getItem(KEYS.APP_VERSION);
    if (storedVersion !== appVersion) {
      this.clearAll();
      localStorage.setItem(KEYS.APP_VERSION, appVersion);
    }
  },
};
