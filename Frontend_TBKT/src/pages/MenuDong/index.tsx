import React, { useMemo, useRef, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { useLocation, useParams } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import { useDynamicMenuConfig } from "../../hooks/useDynamicMenuConfig";
import {
  normalizeColumns,
  normalizeDataSource,
} from "../../configs/dynamicMenuConfig";
import thamSoApi from "../../apis/thamSoApi";
import TemplateRenderer from "../../components/TemplateRenderer";
import { validateFieldValue } from "../CauHinhThamSo/utils";
import { getRealSetIds } from "../CauHinhThamSo/subComponents/formTabMeta";
import { getStableFormConfigKey } from "../../utils/formConfigKeys";
import notify from "../../utils/notification";
import type {
  CreateDialogState,
  RuntimeIntentEvent,
} from "./types";
import DynamicRowDialog from "./components/DynamicRowDialog";
import RowViewDialog from "./components/RowViewDialog";
import LegacyPipelineSection from "./components/LegacyPipelineSection";
import { useLegacyMenuDongLogic } from "./hooks/useLegacyMenuDongLogic";
import { useTemplateButtonIntentListener } from "./hooks/useTemplateButtonIntentListener";
import { useDataTableRowActionListener } from "./hooks/useDataTableRowActionListener";
import {
  buildFallbackFields,
  parsePayloadObject,
  resolveFieldsFromForm,
  resolveTabGroupsFromForm,
} from "./helpers";

const MAX_COLUMNS = 12;

const INITIAL_CREATE_STATE: CreateDialogState = {
  open: false,
  mode: "create",
  loading: false,
  submitLoading: false,
  error: "",
  formKey: "",
  endpoint: "",
  actionKey: "create_item",
  fields: [],
  tabGroups: [],
  values: {},
  errors: {},
  info: "",
};

const MenuDong: React.FC = () => {
  const theme = useTheme();
  const titleBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`;
  const { menuId = "" } = useParams();
  const location = useLocation();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { items, dataSources } = useDynamicMenuConfig();
  const [createDialog, setCreateDialog] =
    useState<CreateDialogState>(INITIAL_CREATE_STATE);

  const menuConfig =
    items.find((item) => item.path === location.pathname) ||
    items.find((item) => item.id === menuId);

  const hasConfig = !!menuConfig;

  // Legacy DataGrid fields (backward compat)
  const gridCount = hasConfig ? Math.max(1, menuConfig!.gridCount) : 1;
  const dataSource = hasConfig
    ? normalizeDataSource(menuConfig!.dataSource)
    : "";
  const columnCount = hasConfig
    ? Math.min(MAX_COLUMNS, Math.max(1, menuConfig!.columnCount || 4))
    : 4;
  const columns = hasConfig
    ? normalizeColumns(
        dataSource,
        columnCount,
        menuConfig!.columns,
        dataSources,
      )
    : [];
  const defaultColumnLabels = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    columns.forEach((col) => {
      const key = (col.key || "").trim();
      const name = (col.name || "").trim();
      if (!key || !name) return;
      map[key] = name;
      map[key.toLowerCase()] = name;
    });
    return map;
  }, [columns]);

  const dsConfig = dataSources.find((ds) => ds.sourceKey === dataSource);
  // Runtime uses datasource.templateKey as primary source of truth.
  const runtimeTemplateKey = (
    dsConfig?.templateKey || menuConfig?.templateKey || ""
  ).trim();
  const useTemplate = hasConfig && !!runtimeTemplateKey;

  const openCreateDialog = async (
    detail: RuntimeIntentEvent,
  ): Promise<void> => {
    const payload = parsePayloadObject(detail.payloadJson);
    const requestedActionKey = String(detail.actionKey || "").trim().toLowerCase();
    const payloadFormKey = String(payload.formKey || "").trim();
    const fallbackFormKey = requestedActionKey === "create_item"
      ? ""
      : String(runtimeTemplateKey || "").trim();
    const formKey = payloadFormKey || fallbackFormKey;
    if (!formKey) {
      if (requestedActionKey === "create_item") {
        notify.error(
          "Thieu formKey cho create_item. Vui long cau hinh createFormKey tren button hoac payloadJson.formKey.",
        );
      } else {
        notify.error("Khong xac dinh duoc formKey de mo popup Them");
      }
      return;
    }
    setCreateDialog((prev) => ({
      ...prev,
      open: true,
      mode: "create",
      loading: true,
      submitLoading: false,
      error: "",
      formKey,
      endpoint: String(
        detail.endpoint || payload.endpoint || menuConfig?.dataSource || "",
      ).trim(),
      actionKey:
        String(detail.actionKey || "create_item").trim() || "create_item",
      fields: [],
      values: {},
      errors: {},
      info: "",
      tabGroups: [],
    }));

    try {
      const [allFields, allFieldSets, allForms] = await Promise.all([
        thamSoApi.getListDynamicFields(),
        thamSoApi.getListFieldSets(),
        thamSoApi.getListFormConfigs(),
      ]);

      const formConfig = allForms.find(
        (f) => getStableFormConfigKey(f) === formKey,
      );
      if (!formConfig) {
        setCreateDialog((prev) => ({
          ...prev,
          loading: false,
          error: `Khong tim thay FormConfig key: ${formKey}`,
        }));
        return;
      }

      const fields = resolveFieldsFromForm(formConfig, allFieldSets, allFields);
      const tabGroups = resolveTabGroupsFromForm(
        formConfig,
        allFieldSets,
        allFields,
      );
      const finalFields =
        fields.length > 0
          ? fields
          : buildFallbackFields(columns, dsConfig?.fields ?? []);
      const fallbackTabGroups =
        tabGroups.length > 0
          ? tabGroups
          : [{ id: "__fallback__", label: "Thong tin", fields: finalFields }];
      const normalizedTabGroups = fallbackTabGroups.map((group, index) => ({
        id: group.id || `tab_${index + 1}`,
        label: group.label || `Tab ${index + 1}`,
        fields: Array.isArray(group.fields) ? group.fields : [],
      }));
      const requestedSetIds = Array.from(
        new Set(
          formConfig.tabs
            .flatMap((tab) =>
              getRealSetIds(tab).map((id) => String(id || "").trim()),
            )
            .filter(Boolean),
        ),
      );
      const globalSetIdSet = new Set(allFieldSets.map((set) => set.id));
      const missingSetIds = requestedSetIds.filter(
        (id) => !globalSetIdSet.has(id),
      );
      console.log("[MenuDong] create-dialog resolve", {
        formKey,
        fromFormFields: fields.length,
        tabs: formConfig.tabs.length,
        resolvedTabs: normalizedTabGroups.length,
        fallbackColumns: columns.length,
        fallbackDsFields: dsConfig?.fields?.length ?? 0,
        finalFields: finalFields.length,
        missingSetIds,
      });

      if (finalFields.length === 0) {
        const debugInfo = `v2: tabs=${formConfig.tabs.length}, cols=${columns.length}, dsFields=${dsConfig?.fields?.length ?? 0}`;
        setCreateDialog((prev) => ({
          ...prev,
          loading: false,
          error: `FormConfig "${formKey}" khong co field active (${debugInfo})`,
        }));
        return;
      }

      const info =
        fields.length === 0 && finalFields.length > 0
          ? "Dang dung fallback field tu DataSource/columns vi FormConfig chua map duoc DynamicField."
          : "";
      setCreateDialog((prev) => ({
        ...prev,
        loading: false,
        fields: finalFields,
        tabGroups: normalizedTabGroups,
        info,
      }));
    } catch (err) {
      setCreateDialog((prev) => ({
        ...prev,
        loading: false,
        error: (err as Error)?.message || "Khong the tai cau hinh form dong",
      }));
    }
  };

  const {
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
  } = useLegacyMenuDongLogic({
    hasConfig,
    useTemplate,
    dataSource,
    columns,
    dataSources,
    menuConfig,
    runtimeTemplateKey,
    openCreateDialog,
    setCreateDialog,
  });

  const closeCreateDialog = (): void => setCreateDialog(INITIAL_CREATE_STATE);

  const handleCreateFieldChange = (key: string, value: string): void => {
    setCreateDialog((prev) => ({
      ...prev,
      values: { ...prev.values, [key]: value },
      errors: { ...prev.errors, [key]: null },
    }));
  };

  const submitCreateDialog = async (): Promise<void> => {
    const nextErrors: Record<string, string | null> = {};
    createDialog.fields.forEach((field) => {
      nextErrors[field.key] = validateFieldValue(
        createDialog.values[field.key],
        field,
      );
    });
    const firstError = Object.values(nextErrors).find((msg) => Boolean(msg));
    if (firstError) {
      setCreateDialog((prev) => ({ ...prev, errors: nextErrors }));
      return;
    }

    try {
      setCreateDialog((prev) => ({ ...prev, submitLoading: true }));
      const targetSourceKey = (
        createDialog.endpoint ||
        dataSource ||
        ""
      ).trim();
      if (!targetSourceKey)
        throw new Error("Khong xac dinh duoc sourceKey de luu du lieu");
      await thamSoApi.saveDynamicMenuRow(
        targetSourceKey,
        createDialog.values,
        true,
      );

      window.dispatchEvent(
        new CustomEvent("template:datasource:refresh", {
          detail: {
            sourceKey: dataSource || null,
            menuId: menuConfig?.id || null,
            formKey: createDialog.formKey || null,
          },
        }),
      );
      if (!useTemplate && targetSourceKey) {
        try {
          await refreshRows(targetSourceKey);
        } catch (reloadErr) {
          notify.error(
            (reloadErr as Error)?.message || "Khong the tai du lieu sau khi luu",
          );
        }
      }
      notify.success(
        createDialog.mode === "edit"
          ? "Da cap nhat du lieu"
          : "Da luu du lieu tao moi",
      );
      closeCreateDialog();
    } catch (err) {
      setCreateDialog((prev) => ({
        ...prev,
        submitLoading: false,
        error: (err as Error)?.message || "Khong the submit du lieu",
      }));
    }
  };

  useTemplateButtonIntentListener({
    importInputRef,
    openCreateDialog,
  });

  useDataTableRowActionListener({
    onView: handleViewRow,
    onEdit: handleEditRow,
    onDelete: handleDeleteRow,
    onPrint: handlePrintRow,
    onExport: handleExportRow,
  });

  if (!hasConfig) {
    return (
      <Box sx={{ p: 2 }}>
        <input ref={importInputRef} type="file" style={{ display: "none" }} />
        <Alert severity="warning">
          Không tìm thấy cấu hình menu động. Vui lòng kiểm tra lại trong trang
          cấu hình menu động.
        </Alert>
      </Box>
    );
  }

  // ── New pipeline: render via Puck template ──
  if (useTemplate) {
    return (
      <Box
        sx={{
          p: 2,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <input ref={importInputRef} type="file" style={{ display: "none" }} />
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          {menuConfig!.title}
        </Typography>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TemplateRenderer
            templateKey={runtimeTemplateKey}
            defaultSourceKey={dataSource}
            defaultColumnLabels={defaultColumnLabels}
            defaultColumns={columns}
            permissionCode={menuConfig?.permissionCode}
            fillParent
          />
        </Box>
        <DynamicRowDialog
          state={createDialog}
          titleBg={titleBg}
          onClose={closeCreateDialog}
          onSubmit={() => {
            void submitCreateDialog();
          }}
          onChange={handleCreateFieldChange}
        />
        <RowViewDialog
          state={viewDialog}
          titleBg={titleBg}
          onClose={closeViewDialog}
        />
      </Box>
    );
  }

  // ── Legacy pipeline: DataGrid ──
  return (
    <>
      <input ref={importInputRef} type="file" style={{ display: "none" }} />
      <LegacyPipelineSection
        title={menuConfig!.title}
        gridCount={gridCount}
        columnCount={columnCount}
        dsDisplayName={dsDisplayName}
        loadError={loadError}
        visibleColumnLabels={visibleColumnLabels}
        mappedRows={mappedRows}
        gridColumns={gridColumns}
        loadingRows={loadingRows}
        onView={handleViewRow}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
        onPrint={handlePrintRow}
        onExport={handleExportRow}
        isRowActionDisabled={(action, row) => !canUseRowAction(
          action === "export" ? "download" : action,
          row,
        )}
      />
      <DynamicRowDialog
        state={createDialog}
        titleBg={titleBg}
        onClose={closeCreateDialog}
        onSubmit={() => {
          void submitCreateDialog();
        }}
        onChange={handleCreateFieldChange}
      />
      <RowViewDialog
        state={viewDialog}
        titleBg={titleBg}
        onClose={closeViewDialog}
      />
    </>
  );
};

export default MenuDong;
