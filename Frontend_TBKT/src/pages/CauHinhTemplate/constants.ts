import type { FormState } from './types';

export { DEFAULT_PUCK_DATA, toEditorData, toSchemaJson } from '../../features/templateRuntime/editorData';

export const INITIAL_FORM: FormState = {
    id: '',
    key: '',
    name: '',
    schemaJson: '{\n  "content": []\n}',
    published: false,
};

export const toSlug = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
