import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { GridColDef } from "@mui/x-data-grid";
import IconPickerPopover from "../CauHinhThamSo/subComponents/IconPickerPopover";
import {
  normalizeColumns,
  normalizeDataSource,
  normalizeGridCount,
  normalizeMenuPath,
  normalizePermissionCode,
} from "../../configs/dynamicMenuConfig";
import {
  buildFieldOptions,
  buildSourceOptions,
} from "../../configs/dynamicMenuDataSource";
import {
  notifyDynamicMenuConfigChanged,
  useDynamicMenuConfig,
} from "../../hooks/useDynamicMenuConfig";
import type { DynamicMenuConfigItem } from "../../types/dynamicMenu";
import { nameToIcon } from "../../utils/thamSoUtils";
import { buildAuditSummary } from "../../utils/auditMeta";
import thamSoApi, {
  type LocalTemplateLayoutSummary,
} from "../../apis/thamSoApi";
import LazyDataGrid from "../../components/LazyDataGrid";

type FormCol = { key: string; name: string };
type FormState = {
  id: string;
  title: string;
  path: string;
  icon: string;
  templateKey: string;
  permissionCode: string;
  dataSource: string;
  gridCount: number;
  columnCount: number;
  columns: FormCol[];
};
type DataSource = {
  sourceKey: string;
  sourceName: string;
  enabled?: boolean;
  fields: Array<{ key: string; label?: string }>;
};

const INITIAL_FORM: FormState = {
  id: "",
  title: "",
  path: "",
  icon: "Assignment",
  templateKey: "",
  permissionCode: "",
  dataSource: "employee",
  gridCount: 1,
  columnCount: 4,
  columns: [],
};
const toSlug = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const norm = (v: string) => (v || "").trim().toLowerCase();
const perfNow = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
const getValue = (obj: Record<string, unknown>, key: string) => {
  const v = obj[key];
  if (v == null) return "";
  if (typeof v === "object" && v && "value" in v)
    return String((v as { value?: unknown }).value ?? "");
  return typeof v === "object" ? "" : String(v);
};

const getTemplateColsFromSchema = (schemaJson?: string): number | null => {
  if (!schemaJson?.trim()) return null;
  try {
    const json = JSON.parse(schemaJson) as {
      content?: Array<{ type?: string; props?: Record<string, unknown> }>;
    };
    const tables = (json.content ?? []).filter((b) => b?.type === "DataTable");
    if (!tables.length) return null;
    return (
      tables.reduce(
        (m, t) =>
          Math.max(
            m,
            Array.isArray(t.props?.visibleColumns)
              ? t.props.visibleColumns.length
              : 0,
            Array.isArray(t.props?.columns) ? t.props.columns.length : 0,
          ),
        0,
      ) || null
    );
  } catch {
    return null;
  }
};

function WorkflowStepper() {
  const steps = [
    {
      label: "Tao template",
      hint: "Vao CauHinhTemplate, tao template va dat key.",
    },
    {
      label: "Chon datasource",
      hint: "Menu dong doc du lieu tu datasource dang bat.",
    },
    {
      label: "Mapping columns",
      hint: "Kiem tra mapping va preview truoc khi luu.",
    },
  ];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0}
        divider={
          <Typography sx={{ px: 1, color: "text.disabled", fontSize: 14 }}>
            {">"}
          </Typography>
        }
      >
        {steps.map((step, i) => (
          <Tooltip key={step.label} title={step.hint} arrow>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: i < 2 ? "success.light" : "primary.main",
                  color: i < 2 ? "success.dark" : "primary.contrastText",
                }}
              >
                {i < 2 ? "OK" : "3"}
              </Box>
              <Typography variant="caption">{step.label}</Typography>
            </Stack>
          </Tooltip>
        ))}
      </Stack>
    </Paper>
  );
}

function FormModeBadge({
  editingId,
  title,
}: {
  editingId: string | null;
  title: string;
}) {
  const theme = useTheme();
  const isEditing = Boolean(editingId);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isEditing ? "warning.light" : "success.light",
        bgcolor: isEditing
          ? theme.palette.mode === "dark"
            ? "rgba(237,108,2,0.08)"
            : "warning.50"
          : theme.palette.mode === "dark"
            ? "rgba(46,125,50,0.08)"
            : "success.50",
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: isEditing ? "warning.main" : "success.main",
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {isEditing ? (
          <>
            Dang sua: <strong>{title}</strong>
          </>
        ) : (
          <>Tao menu moi</>
        )}
      </Typography>
    </Box>
  );
}

const MenuForm = React.memo(function MenuForm({
  editingId,
  initialValues,
  dataSources,
  templates,
  existingIds,
  loading,
  onSave,
  onCancel,
  getTemplateColumnCount,
}: {
  editingId: string | null;
  initialValues: FormState;
  dataSources: DataSource[];
  templates: LocalTemplateLayoutSummary[];
  existingIds: string[];
  loading: boolean;
  onSave: (
    item: DynamicMenuConfigItem,
    editingId: string | null,
  ) => Promise<void>;
  onCancel: () => void;
  getTemplateColumnCount: (templateKey: string) => Promise<number | null>;
}) {
  const [form, setForm] = useState<FormState>(initialValues);
  const [error, setError] = useState("");
  const [iconAnchor, setIconAnchor] = useState<HTMLElement | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templateCols, setTemplateCols] = useState<number | null>(null);

  useEffect(() => {
    setForm(initialValues);
    setError("");
  }, [initialValues]);
  useEffect(() => {
    let canceled = false;
    const key = (form.templateKey || "").trim();
    if (!key) {
      setTemplateCols(null);
      return () => {
        canceled = true;
      };
    }
    void (async () => {
      const count = await getTemplateColumnCount(key);
      if (!canceled) setTemplateCols(count);
    })();
    return () => {
      canceled = true;
    };
  }, [form.templateKey, getTemplateColumnCount]);

  const ds = normalizeDataSource(form.dataSource);
  const colCount = templateCols ?? Math.max(1, form.columnCount || 4);
  const normalizedSources = useMemo(
    () =>
      dataSources.map((s) => ({
        ...s,
        enabled: Boolean(s.enabled),
        fields: (s.fields ?? []).map((f) => ({
          key: f.key,
          label: f.label ?? f.key,
        })),
      })),
    [dataSources],
  );
  const sourceOptions = useMemo(
    () => buildSourceOptions(normalizedSources),
    [normalizedSources],
  );
  const fieldOptions = useMemo(
    () => buildFieldOptions(ds, normalizedSources),
    [ds, normalizedSources],
  );
  const selected = useMemo(
    () => dataSources.find((x) => norm(x.sourceKey) === norm(ds)) ?? null,
    [dataSources, ds],
  );
  const columns = useMemo(
    () => normalizeColumns(ds, colCount, form.columns, dataSources),
    [ds, colCount, form.columns, dataSources],
  );
  const mismatch = useMemo(() => {
    if (!selected) return new Set(columns.map((c) => c.key));
    const valid = new Set(selected.fields.map((f) => norm(f.key)));
    return new Set(
      columns.filter((c) => !valid.has(norm(c.key))).map((c) => c.key),
    );
  }, [columns, selected]);

  useEffect(() => {
    if (!ds) return;
    let canceled = false;
    void (async () => {
      try {
        setPreviewLoading(true);
        const rows = await thamSoApi.getDynamicMenuRows(ds, 10);
        if (!canceled) setPreviewRows(rows);
      } finally {
        if (!canceled) setPreviewLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [ds]);
  const previewCols = useMemo<GridColDef[]>(
    () =>
      columns.map((c, i) => ({
        field: `col_${i + 1}`,
        headerName: c.name,
        minWidth: 130,
        flex: 1,
      })),
    [columns],
  );
  const previewGridRows = useDeferredValue(
    useMemo(
      () =>
        previewRows.map((row, ri) => {
          const item: Record<string, string> = {
            id: String(row.id ?? `r-${ri}`),
          };
          columns.forEach((c, ci) => {
            item[`col_${ci + 1}`] = getValue(row, c.key);
          });
          return item;
        }),
      [previewRows, columns],
    ),
  );

  const submit = async () => {
    const title = form.title.trim();
    const id = editingId ?? toSlug(form.id || title);
    if (!title) return setError("Vui long nhap ten menu.");
    if (!id) return setError("Ma menu khong hop le.");
    if (!selected) return setError("Vui long chon datasource hop le.");
    if (existingIds.includes(id) && id !== editingId)
      return setError("Ma menu da ton tai.");
    const next: DynamicMenuConfigItem = {
      id,
      title,
      path: normalizeMenuPath(form.path || "", id),
      active: `menuDong_${id}`,
      icon: form.icon || "Assignment",
      permissionCode: normalizePermissionCode(form.permissionCode, id),
      templateKey: form.templateKey.trim(),
      dataSource: ds,
      gridCount: normalizeGridCount(form.gridCount),
      columnCount: colCount,
      columns: normalizeColumns(ds, colCount, form.columns, dataSources),
      enabled: true,
    };
    await onSave(next, editingId);
    setForm(INITIAL_FORM);
  };

  return (
    <Stack spacing={2}>
      <FormModeBadge editingId={editingId} title={form.title || "..."} />
      {error && (
        <Alert severity="warning" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {mismatch.size > 0 && (
        <Alert severity="warning">
          {mismatch.size} cot map sai field: {[...mismatch].join(", ")}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            label="Ten menu"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Ma menu"
              value={form.id}
              disabled={Boolean(editingId)}
              onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="Duong dan"
              value={form.path}
              onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
            />
          </Stack>
          <TextField
            size="small"
            label="Ma quyen"
            value={form.permissionCode}
            onChange={(e) =>
              setForm((p) => ({ ...p, permissionCode: e.target.value }))
            }
          />
          <Stack direction="row" spacing={1.5}>
            <Select
              size="small"
              fullWidth
              value={ds}
              onChange={(e) =>
                setForm((p) => ({ ...p, dataSource: e.target.value }))
              }
            >
              {sourceOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              fullWidth
              value={form.templateKey}
              onChange={(e) =>
                setForm((p) => ({ ...p, templateKey: e.target.value }))
              }
              displayEmpty
            >
              <MenuItem value="">
                <em>- Chua chon -</em>
              </MenuItem>
              {templates.map((t) => (
                <MenuItem key={t.key} value={t.key}>
                  {t.published ? "" : "[Draft] "}
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => setIconAnchor(e.currentTarget)}
              sx={{
                flex: 1,
                textTransform: "none",
                justifyContent: "flex-start",
                gap: 1,
              }}
            >
              {nameToIcon(form.icon || "Assignment")}
              <Typography variant="body2">
                {form.icon || "Assignment"}
              </Typography>
            </Button>
            <TextField
              size="small"
              type="number"
              sx={{ width: 120 }}
              value={normalizeGridCount(form.gridCount)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  gridCount: Number(e.target.value) || 1,
                }))
              }
            />
            <TextField
              size="small"
              sx={{ width: 130 }}
              value={colCount}
              disabled
            />
          </Stack>
          <IconPickerPopover
            anchorEl={iconAnchor}
            open={Boolean(iconAnchor)}
            selectedIconName={form.icon || "Assignment"}
            selectedColor="#2e7d32"
            onSelect={(n) => {
              setForm((p) => ({ ...p, icon: n || "Assignment" }));
              setIconAnchor(null);
            }}
            onClose={() => setIconAnchor(null)}
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 1 }}
        >
          Mapping cot runtime
        </Typography>
        <Box
          sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 42px", gap: 1 }}
        >
          {columns.map((c, idx) => (
            <React.Fragment key={`col-${idx}`}>
              <TextField
                size="small"
                value={c.name}
                onChange={(e) =>
                  setForm((p) => {
                    const next = [
                      ...normalizeColumns(ds, colCount, p.columns, dataSources),
                    ];
                    next[idx] = { ...next[idx], name: e.target.value };
                    return { ...p, columns: next };
                  })
                }
              />
              <Select
                size="small"
                value={c.key}
                onChange={(e) =>
                  setForm((p) => {
                    const next = [
                      ...normalizeColumns(ds, colCount, p.columns, dataSources),
                    ];
                    next[idx] = { ...next[idx], key: e.target.value };
                    return { ...p, columns: next };
                  })
                }
              >
                {fieldOptions.map((f) => (
                  <MenuItem key={f.key} value={f.key}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {mismatch.has(c.key) ? (
                  <WarningAmberIcon
                    sx={{ color: "warning.main", fontSize: 18 }}
                  />
                ) : (
                  <CheckCircleOutlineIcon
                    sx={{ color: "success.main", fontSize: 18 }}
                  />
                )}
              </Box>
            </React.Fragment>
          ))}
        </Box>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          onClick={() => void submit()}
          disabled={loading}
        >
          {editingId ? "Cap nhat menu" : "Them menu"}
        </Button>
        {editingId && (
          <Button variant="outlined" onClick={onCancel}>
            Huy sua
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Preview du lieu mau
          </Typography>
        </Box>
        <Box sx={{ height: 280 }}>
          <LazyDataGrid
            rows={previewGridRows}
            columns={previewCols}
            loading={previewLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10]}
            fallbackRows={5}
            fallbackCols={Math.max(previewCols.length, 3)}
          />
        </Box>
      </Paper>
    </Stack>
  );
});

const CauHinhMenuDong: React.FC = () => {
  const {
    items,
    dataSources,
    loading,
    error: loadError,
    reload,
    createItem,
    updateItem,
    deleteItem,
  } = useDynamicMenuConfig();
  const [deletedItems, setDeletedItems] = useState<DynamicMenuConfigItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<FormState>(INITIAL_FORM);
  const [listError, setListError] = useState("");
  const [templates, setTemplates] = useState<LocalTemplateLayoutSummary[]>([]);
  const templateColCountCacheRef = useRef<Record<string, number | null>>({});

  useEffect(() => {
    void (async () => {
      const startedAt = perfNow();
      try {
        const summary = await thamSoApi.getListTemplateLayoutSummaries();
        setTemplates(summary);
        console.info("[PERF][CauHinhMenu][summary]", {
          count: summary.length,
          elapsedMs: Math.round(perfNow() - startedAt),
        });
      } catch {
        setTemplates([]);
        console.info("[PERF][CauHinhMenu][summary]", {
          count: 0,
          elapsedMs: Math.round(perfNow() - startedAt),
          failed: true,
        });
      }
    })();
  }, []);
  const getTemplateColumnCount = useCallback(
    async (templateKey: string): Promise<number | null> => {
      const startedAt = perfNow();
      const key = (templateKey || "").trim();
      if (!key) return null;
      if (Object.prototype.hasOwnProperty.call(templateColCountCacheRef.current, key)) {
        const cached = templateColCountCacheRef.current[key];
        console.info("[PERF][CauHinhMenu][cache-hit]", {
          key,
          cachedCount: cached,
          elapsedMs: Math.round(perfNow() - startedAt),
        });
        return cached;
      }
      try {
        const detail = await thamSoApi.getTemplateLayoutDetail({ key });
        const count = getTemplateColsFromSchema(detail.schemaJson);
        templateColCountCacheRef.current[key] = count;
        console.info("[PERF][CauHinhMenu][detail]", {
          key,
          count,
          elapsedMs: Math.round(perfNow() - startedAt),
        });
        return count;
      } catch {
        templateColCountCacheRef.current[key] = null;
        console.info("[PERF][CauHinhMenu][detail]", {
          key,
          count: null,
          elapsedMs: Math.round(perfNow() - startedAt),
          failed: true,
        });
        return null;
      }
    },
    [],
  );

  const existingIds = useMemo(() => items.map((x) => x.id), [items]);
  const deferredItems = useDeferredValue(items);
  const deferredDeleted = useDeferredValue(deletedItems);
  const gridRows = useDeferredValue(
    useMemo(
      () =>
        items.map((it) => {
          const ds = dataSources.find(
            (d) => norm(d.sourceKey) === norm(it.dataSource),
          );
          const keys = new Set((ds?.fields ?? []).map((f) => norm(f.key)));
          const mismatch = (it.columns ?? []).filter(
            (c) => !keys.has(norm(c.key)),
          ).length;
          return {
            ...it,
            sourceName: ds?.sourceName || it.dataSource,
            mappingText: mismatch > 0 ? `${mismatch} cot loi` : "Hop le",
            templateName:
              templates.find((t) => t.key === it.templateKey)?.name ||
              it.templateKey ||
              "-",
            statusText: it.enabled ? "Bat" : "Tat",
            auditText: buildAuditSummary(it.audit),
          };
        }),
      [items, dataSources, templates],
    ),
  );
  const gridColumns = useMemo<GridColDef[]>(
    () => [
      { field: "title", headerName: "Ten menu", flex: 1.2, minWidth: 160 },
      {
        field: "sourceName",
        headerName: "Datasource",
        flex: 0.9,
        minWidth: 130,
      },
      { field: "mappingText", headerName: "Mapping", flex: 0.7, minWidth: 110 },
      {
        field: "permissionCode",
        headerName: "Ma quyen",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "templateName",
        headerName: "Template",
        flex: 0.9,
        minWidth: 140,
      },
      {
        field: "statusText",
        headerName: "Trang thai",
        width: 100,
        align: "center",
        headerAlign: "center",
      },
      { field: "auditText", headerName: "Cap nhat", flex: 1, minWidth: 180 },
    ],
    [],
  );

  const onEdit = useCallback(
    (row: DynamicMenuConfigItem) => {
      const cnt = Math.max(1, row.columnCount || 4);
      setEditingId(row.id);
      setInitialValues({
        id: row.id,
        title: row.title,
        path: row.path,
        icon: row.icon || "Assignment",
        templateKey: row.templateKey || "",
        permissionCode: row.permissionCode || "",
        dataSource: normalizeDataSource(row.dataSource),
        gridCount: normalizeGridCount(row.gridCount),
        columnCount: cnt,
        columns: normalizeColumns(
          normalizeDataSource(row.dataSource),
          cnt,
          row.columns,
          dataSources,
        ),
      });
      if (row.templateKey) void getTemplateColumnCount(row.templateKey);
      setListError("");
    },
    [dataSources, getTemplateColumnCount],
  );
  const onCancel = useCallback(() => {
    setEditingId(null);
    setInitialValues(INITIAL_FORM);
    setListError("");
  }, []);
  const onSave = useCallback(
    async (next: DynamicMenuConfigItem, id: string | null) => {
      if (id) {
        const cur = items.find((x) => x.id === id);
        await updateItem({ ...next, enabled: cur?.enabled ?? true });
      } else {
        await createItem(next);
      }
      notifyDynamicMenuConfigChanged();
      onCancel();
    },
    [items, updateItem, createItem, onCancel],
  );
  const onToggle = useCallback(
    async (id: string) => {
      try {
        const t = items.find((x) => x.id === id);
        if (!t) return;
        await updateItem({ ...t, enabled: !t.enabled });
        notifyDynamicMenuConfigChanged();
      } catch (e) {
        setListError((e as Error)?.message || "Khong the cap nhat trang thai");
      }
    },
    [items, updateItem],
  );
  const onDelete = useCallback(
    async (id: string) => {
      const d = items.find((x) => x.id === id);
      try {
        await deleteItem(id);
        if (d) setDeletedItems((p) => [d, ...p.filter((x) => x.id !== d.id)]);
        notifyDynamicMenuConfigChanged();
        if (editingId === id) onCancel();
      } catch (e) {
        setListError((e as Error)?.message || "Khong the xoa menu");
      }
    },
    [deleteItem, editingId, items, onCancel],
  );
  const onRestore = useCallback(
    async (id: string) => {
      try {
        setListError("");
        await thamSoApi.restoreDynamicMenu(id);
        setDeletedItems((p) => p.filter((x) => x.id !== id));
        notifyDynamicMenuConfigChanged();
        await reload();
      } catch (e) {
        setListError((e as Error)?.message || "Khong the khoi phuc menu");
      }
    },
    [reload],
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Cau hinh menu dong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Them, sua, bat/tat cac muc menu sinh tu datasource
          </Typography>
        </Box>
        <Button
          variant="contained"
          disableElevation
          startIcon={<AddIcon />}
          onClick={onCancel}
        >
          Them menu
        </Button>
      </Stack>
      <WorkflowStepper />
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {listError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setListError("")}
        >
          {listError}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "400px 1fr" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
          <MenuForm
            editingId={editingId}
            initialValues={initialValues}
            dataSources={dataSources}
            templates={templates}
            existingIds={existingIds}
            loading={loading}
            onSave={onSave}
            onCancel={onCancel}
            getTemplateColumnCount={getTemplateColumnCount}
          />
        </Box>
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden" }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Danh sach menu{" "}
                <Chip size="small" label={items.length} sx={{ fontSize: 11 }} />
              </Typography>
            </Box>
            <Box sx={{ height: 300 }}>
              <LazyDataGrid
                rows={gridRows}
                columns={gridColumns}
                loading={loading}
                disableRowSelectionOnClick
                onRowClick={(params) =>
                  onEdit(params.row as DynamicMenuConfigItem)
                }
                pageSizeOptions={[5, 10, 20]}
                fallbackRows={5}
                fallbackCols={6}
              />
            </Box>
          </Paper>
          <Box sx={{ maxHeight: 420, overflow: "auto", pr: 0.5 }}>
            {deferredItems.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor:
                    editingId === item.id ? "primary.main" : "divider",
                  cursor: "pointer",
                }}
                onClick={() => onEdit(item)}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {nameToIcon(item.icon || "Assignment")}
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={item.enabled ? "Bat" : "Tat"}
                    color={item.enabled ? "success" : "default"}
                    sx={{ ml: "auto" }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {item.path}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FormControlLabel
                    sx={{ mr: "auto", ml: 0 }}
                    label=""
                    control={
                      <Switch
                        size="small"
                        checked={item.enabled}
                        onChange={() => void onToggle(item.id)}
                      />
                    }
                  />
                  <Typography variant="caption" color="text.disabled">
                    {buildAuditSummary(item.audit)}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onEdit(item)}
                  >
                    Sua
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => void onDelete(item.id)}
                  >
                    Xoa
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Box>
          {deferredDeleted.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Khoi phuc menu da xoa
              </Typography>
              <Stack spacing={1}>
                {deferredDeleted.map((item) => (
                  <Stack
                    key={`restore-${item.id}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.path}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void onRestore(item.id)}
                    >
                      Khoi phuc
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default CauHinhMenuDong;
