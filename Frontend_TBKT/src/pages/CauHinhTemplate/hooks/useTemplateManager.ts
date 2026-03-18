import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Data } from '@puckeditor/core';
import thamSoApi, { type LocalTemplateLayout } from '../../../apis/thamSoApi';
import { DEFAULT_PUCK_DATA, INITIAL_FORM, toEditorData, toSchemaJson, toSlug } from '../constants';
import type { FormState } from '../types';

export interface UseTemplateManagerReturn {
  items: LocalTemplateLayout[];
  loading: boolean;
  saving: boolean;
  error: string;
  form: FormState;
  editorData: Data;
  editingId: string;
  setForm: Dispatch<SetStateAction<FormState>>;
  setEditorData: Dispatch<SetStateAction<Data>>;
  handleEdit: (item: LocalTemplateLayout) => void;
  handleReset: () => void;
  handleSave: (dataToSave?: Data) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleTogglePublish: (item: LocalTemplateLayout) => Promise<void>;
}

export const useTemplateManager = (): UseTemplateManagerReturn => {
  const [items, setItems] = useState<LocalTemplateLayout[]>([]);
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
      const result = await thamSoApi.getListTemplateLayouts();
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

  const handleEdit = (item: LocalTemplateLayout): void => {
    const nextData = toEditorData(item.schemaJson || '{}');
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

  const handleTogglePublish = async (item: LocalTemplateLayout): Promise<void> => {
    try {
      setError('');
      await thamSoApi.saveTemplateLayout({ ...item, published: !item.published }, false);
      await loadItems();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể cập nhật trạng thái template');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      setError('');
      await thamSoApi.deleteTemplateLayout(id);
      await loadItems();
      if (editingId === id) handleReset();
    } catch (err) {
      setError((err as Error)?.message || 'Không thể xoá template');
    }
  };

  return {
    items,
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
  };
};
