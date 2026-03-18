import type { Data } from '@puckeditor/core';
import type { FormState } from './types';

export const INITIAL_FORM: FormState = {
  id: '',
  key: '',
  name: '',
  schemaJson: '{\n  "content": []\n}',
  published: false,
};

export const DEFAULT_PUCK_DATA: Data = {
  root: {},
  content: [],
};

export const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const toEditorData = (schemaJson: string): Data => {
  if (!schemaJson?.trim()) return DEFAULT_PUCK_DATA;
  try {
    const parsed = JSON.parse(schemaJson) as Partial<Data>;
    return {
      root: parsed?.root && typeof parsed.root === 'object' ? parsed.root : {},
      content: Array.isArray(parsed?.content) ? parsed.content : [],
      zones: parsed?.zones && typeof parsed.zones === 'object' ? parsed.zones : undefined,
    };
  } catch {
    return DEFAULT_PUCK_DATA;
  }
};

export const toSchemaJson = (data: Data): string => JSON.stringify(data, null, 2);
