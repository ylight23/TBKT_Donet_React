import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Data } from '@puckeditor/core';
import thamSoApi, { type LocalTemplateLayout, type LocalTemplateLayoutSummary } from '../../../apis/thamSoApi';
import { DEFAULT_PUCK_DATA, INITIAL_FORM, toEditorData, toSchemaJson, toSlug } from '../constants';
import type { FormState } from '../types';

export interface UseTemplateManagerReturn {
  items: LocalTemplateLayoutSummary[];
  deletedItems: LocalTemplateLayoutSummary[];
  loading: boolean;
  saving: boolean;
  error: string;
  form: FormState;
  editorData: Data;
  editingId: string;
  setForm: Dispatch<SetStateAction<FormState>>;
  setEditorData: Dispatch<SetStateAction<Data>>;
  handleEdit: (item: LocalTemplateLayoutSummary) => Promise<void>;
  handleReset: () => void;
  handleSave: (dataToSave?: Data) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleRestore: (id: string) => Promise<void>;
  handleTogglePublish: (item: LocalTemplateLayoutSummary) => Promise<void>;
}

export const useTemplateManager = (): UseTemplateManagerReturn => {
  const [items, setItems] = useState<LocalTemplateLayoutSummary[]>([]);
  const [deletedItems, setDeletedItems] = useState<LocalTemplateLayoutSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editorData, setEditorData] = useState<Data>(DEFAULT_PUCK_DATA);
  const [editingId, setEditingId] = useState('');

  const loadItems = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const result = await thamSoApi.getListTemplateLayoutSummaries();
      setItems(result);
    } catch (err) {
      setError((err as Error)?.message || 'Không thể tải danh sách template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = async (item: LocalTemplateLayoutSummary): Promise<void> => {
    const detail = await thamSoApi.getTemplateLayoutDetail({ key: item.key });
    const nextData = toEditorData(detail.schemaJson || '{}');
    setEditingId(item.id);
    setForm({
      id: item.id,
      key: item.key,
      name: item.name,
      schemaJson: toSchemaJson(nextData),
      published: item.published,
    });
    setEditorData(nextData);
  };

  const handleReset = (): void => {
    setEditingId('');
    setForm(INITIAL_FORM);
    setEditorData(DEFAULT_PUCK_DATA);
  };

  const handleSave = async (dataToSave?: Data): Promise<void> => {
    try {
      setSaving(true);
      setError('');

      const key = toSlug(form.key || form.name);
      if (!key) {
        setError('Template key không hợp lệ');
        return;
      }

      const normalizedData = dataToSave ?? editorData;
      const schemaJson = toSchemaJson(normalizedData);

      const payload: LocalTemplateLayout = {
        id: editingId,
        key,
        name: form.name.trim() || key,
        schemaJson,
        published: form.published,
      };

      await thamSoApi.saveTemplateLayout(payload, !editingId);
      await loadItems();
      handleReset();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể lưu template');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: LocalTemplateLayoutSummary): Promise<void> => {
    try {
      setError('');
      const detail = await thamSoApi.getTemplateLayoutDetail({ key: item.key });
      await thamSoApi.saveTemplateLayout({ ...detail, published: !item.published }, false);
      await loadItems();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể cập nhật trạng thái template');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const deletedItem = items.find((item) => item.id === id);
    try {
      setError('');
      await thamSoApi.deleteTemplateLayout(id);
      if (deletedItem) {
        setDeletedItems((prev) => [deletedItem, ...prev.filter((item) => item.id !== deletedItem.id)]);
      }
      await loadItems();
      if (editingId === id) handleReset();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể xoá template');
    }
  };

  const handleRestore = async (id: string): Promise<void> => {
    try {
      setError('');
      await thamSoApi.restoreTemplateLayout(id);
      setDeletedItems((prev) => prev.filter((item) => item.id !== id));
      await loadItems();
    } catch (err) {
      setError((err as Error)?.message || 'Khong the khoi phuc template');
    }
  };

  return {
    items,
    deletedItems,
    handleTogglePublish,
    loading,
    saving,
    error,
    form,
    editorData,
    editingId,
    setForm,
    setEditorData,
    handleEdit,
    handleReset,
    handleSave,
    handleDelete,
    handleRestore,
  };
};
