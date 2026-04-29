import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DataSourceConfig } from "../../../apis/thamSoApi";
import thamSoApi from "../../../apis/thamSoApi";
import type { DynamicMenuConfigItem } from "../../../types/dynamicMenu";
import notify from "../../../utils/notification";
import { getValueByKey, resolveRowCnId } from "../helpers";
import type {
  CreateDialogState,
  RuntimeIntentEvent,
  ViewDialogState,
} from "../types";
import { useMyPermissions } from "../../../hooks/useMyPermissions";

const INITIAL_VIEW_DIALOG: ViewDialogState = {
  open: false,
  title: "",
  row: null,
};

type UseLegacyMenuDongLogicParams = {
  hasConfig: boolean;
  useTemplate: boolean;
  runtimeTemplateKey: string;
  dataSource: string;
  columns: Array<{ key: string; name: string }>;
  dataSources: DataSourceConfig[];
  menuConfig?: DynamicMenuConfigItem;
  openCreateDialog: (detail: RuntimeIntentEvent) => Promise<void>;
  setCreateDialog: Dispatch<SetStateAction<CreateDialogState>>;
};

export const useLegacyMenuDongLogic = ({
  hasConfig,
  useTemplate,
  runtimeTemplateKey,
  dataSource,
  columns,
  dataSources,
  menuConfig,
  openCreateDialog,
  setCreateDialog,
}: UseLegacyMenuDongLogicParams) => {
  const { canFunc, canCnAction, loaded: permissionLoaded } = useMyPermissions();
  const [backendRows, setBackendRows] = useState<Record<string, unknown>[]>([]);
  const [loadingRows, setLoadingRows] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");
  const [viewDialog, setViewDialog] =
    useState<ViewDialogState>(INITIAL_VIEW_DIALOG);

  const dsDisplayName =
    dataSources.find((ds) => ds.sourceKey === dataSource)?.sourceName ||
    dataSource;

  const resolveActiveSourceKey = useCallback(
    (eventSourceKey?: string | null): string =>
      String(eventSourceKey || dataSource || "").trim(),
    [dataSource],
  );

  useEffect(() => {
    if (!hasConfig || !dataSource || useTemplate) return;

    const loadRows = async (): Promise<void> => {
      try {
        setLoadingRows(true);
        setLoadError("");
        const rows = await thamSoApi.getDynamicMenuRows(dataSource);
        setBackendRows(rows);
      } catch (err) {
        setLoadError((err as Error)?.message || "Khong the tai du lieu tu backend");
        setBackendRows([]);
      } finally {
        setLoadingRows(false);
      }
    };

    void loadRows();
  }, [dataSource, hasConfig, useTemplate]);

  const mappedRows = useMemo(() => {
    if (!backendRows.length) return [];
    return backendRows.map((source, rowIndex) => {
      const row: Record<string, unknown> = {
        id: String(source.id ?? `row-${rowIndex + 1}`),
      };
      columns.forEach((col, colIdx) => {
        row[`col${colIdx + 1}`] = getValueByKey(source, col.key);
      });
      row.__raw = source;
      return row;
    });
  }, [backendRows, columns]);

  const gridColumns = useMemo(
    () =>
      columns.map((col, idx) => ({
        field: `col${idx + 1}`,
        headerName: col.name,
        flex: 1,
        minWidth: 140,
      })),
    [columns],
  );

  const visibleColumnLabels = useMemo(
    () => gridColumns.map((col) => col.headerName || col.field),
    [gridColumns],
  );

  const closeViewDialog = useCallback(
    (): void => setViewDialog(INITIAL_VIEW_DIALOG),
    [],
  );

  const canUseRowAction = useCallback(
    (
      action: "view" | "edit" | "delete" | "print" | "download",
      row: Record<string, unknown>,
    ): boolean => {
      if (!permissionLoaded) return true;
      const cnId = resolveRowCnId((row.__raw as Record<string, unknown>) || row);
      const allowedByFunc = menuConfig?.permissionCode
        ? canFunc(menuConfig.permissionCode, action)
        : true;
      const allowedByCn = canCnAction(action, cnId);
      return allowedByFunc && allowedByCn;
    },
    [canCnAction, canFunc, menuConfig?.permissionCode, permissionLoaded],
  );

  const refreshRows = useCallback(
    async (sourceKey?: string | null): Promise<void> => {
      const targetSourceKey = resolveActiveSourceKey(sourceKey);
      if (!targetSourceKey) return;
      try {
        setLoadingRows(true);
        setLoadError("");
        const rows = await thamSoApi.getDynamicMenuRows(targetSourceKey);
        setBackendRows(rows);
      } catch (reloadErr) {
        setLoadError((reloadErr as Error)?.message || "Khong the tai du lieu");
        setBackendRows([]);
      } finally {
        setLoadingRows(false);
      }
    },
    [resolveActiveSourceKey],
  );

  const openEditDialogForRow = useCallback(
    async (
      rawRow: Record<string, unknown>,
      sourceKey?: string | null,
    ): Promise<void> => {
      const resolvedSourceKey = resolveActiveSourceKey(sourceKey);
      await openCreateDialog({
        intent: "custom",
        actionKey: "create_item",
        payloadJson: JSON.stringify({
          formKey: String(
            runtimeTemplateKey || resolvedSourceKey || "",
          ).trim(),
          endpoint: String(resolvedSourceKey || "").trim(),
        }),
        endpoint: String(resolvedSourceKey || "").trim(),
      });

      setCreateDialog((prev) => ({
        ...prev,
        mode: "edit",
        values: Object.entries(rawRow || {}).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (value == null) {
              acc[key] = "";
              return acc;
            }
            acc[key] = typeof value === "string" ? value : String(value);
            return acc;
          },
          {},
        ),
        errors: {},
      }));
    },
    [openCreateDialog, resolveActiveSourceKey, runtimeTemplateKey, setCreateDialog],
  );

  const handleViewRow = useCallback((row: Record<string, unknown>): void => {
    if (!canUseRowAction("view", row)) return;
    const raw = (row.__raw as Record<string, unknown>) || row;
    setViewDialog({
      open: true,
      title: "Chi tiet ban ghi",
      row: raw,
    });
  }, [canUseRowAction]);

  const handleEditRow = useCallback(
    async (
      row: Record<string, unknown>,
      sourceKey?: string | null,
    ): Promise<void> => {
      if (!canUseRowAction("edit", row)) return;
      const raw = (row.__raw as Record<string, unknown>) || row;
      await openEditDialogForRow(raw, sourceKey);
    },
    [canUseRowAction, openEditDialogForRow],
  );

  const handleDeleteRow = useCallback(
    async (
      row: Record<string, unknown>,
      sourceKey?: string | null,
    ): Promise<void> => {
      if (!canUseRowAction("delete", row)) return;
      const targetSourceKey = resolveActiveSourceKey(sourceKey);
      if (!targetSourceKey) {
        notify.error("Khong xac dinh duoc sourceKey de xoa ban ghi");
        return;
      }
      const raw = (row.__raw as Record<string, unknown>) || row;
      const dsForAction = dataSources.find(
        (item) => item.sourceKey === targetSourceKey,
      );
      const dsFields = dsForAction?.fields ?? [];
      const deleteField = dsFields.find((f) =>
        ["delete", "deleted", "isdeleted"].includes(
          (f.key || "").trim().toLowerCase(),
        ),
      );

      try {
        if (deleteField) {
          await thamSoApi.saveDynamicMenuRow(
            targetSourceKey,
            {
              ...raw,
              [deleteField.key]: true,
            },
            true,
          );
          notify.success("Da xoa ban ghi (soft-delete)");
        } else {
          const recordId = String(raw.id || raw._id || "").trim();
          if (!recordId) {
            notify.error("Khong tim thay id/_id de xoa ban ghi");
            return;
          }
          await thamSoApi.saveDynamicMenuRow(
            targetSourceKey,
            {
              id: recordId,
              __op: "delete",
            },
            true,
          );
          notify.success("Da xoa ban ghi");
        }
        window.dispatchEvent(
          new CustomEvent("template:datasource:refresh", {
            detail: {
              sourceKey: dataSource || null,
              targetSourceKey,
              menuId: menuConfig?.id || null,
              formKey: runtimeTemplateKey || null,
            },
          }),
        );
        await refreshRows(targetSourceKey);
      } catch (err) {
        notify.error((err as Error)?.message || "Xoa ban ghi that bai");
      }
    },
    [canUseRowAction, dataSource, dataSources, menuConfig?.id, refreshRows, resolveActiveSourceKey, runtimeTemplateKey],
  );

  const handleExportRow = useCallback(
    (row: Record<string, unknown>): void => {
      if (!canUseRowAction("download", row)) return;
      const raw = (row.__raw as Record<string, unknown>) || row;
      const blob = new Blob([JSON.stringify(raw, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const rowId = String(raw.id || raw._id || "row");
      a.href = url;
      a.download = `${dataSource || "data"}-${rowId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [canUseRowAction, dataSource],
  );

  const handlePrintRow = useCallback((row: Record<string, unknown>): void => {
    if (!canUseRowAction("print", row)) return;
    const raw = (row.__raw as Record<string, unknown>) || row;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      notify.warn("Trinh duyet dang chan popup in");
      return;
    }
    const escaped = JSON.stringify(raw, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    printWindow.document.write(
      `<pre style="white-space:pre-wrap;font-family:inherit;padding:16px">${escaped}</pre>`,
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, [canUseRowAction]);

  return {
    loadError,
    loadingRows,
    mappedRows,
    gridColumns,
    visibleColumnLabels,
    dsDisplayName,
    viewDialog,
    closeViewDialog,
    handleViewRow,
    handleEditRow,
    handleDeleteRow,
    handleExportRow,
    handlePrintRow,
    refreshRows,
    canUseRowAction,
  };
};
