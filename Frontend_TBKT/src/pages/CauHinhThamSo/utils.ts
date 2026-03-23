import { LocalDynamicField as DynamicField } from '../../types/thamSo';
import { FIELD_TYPES } from './constants';
import { FieldSet } from './types';

export const typeOf = (v: string) => FIELD_TYPES.find((item) => item.value === v) ?? FIELD_TYPES[0];

export const validateFieldValue = (value: string | undefined, field: DynamicField): string | null => {
    const validation = field.validation ?? {};
    const input = String(value ?? '').trim();

    if (field.type === 'checkbox') {
        if (field.required && input !== 'true') {
            return 'Bắt buộc chọn';
        }
        return null;
    }

    if (field.type === 'checkboxGroup') {
        let selectedValues: string[] = [];

        if (input) {
            try {
                const parsed = JSON.parse(input);
                if (Array.isArray(parsed)) {
                    selectedValues = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
                }
            } catch {
                selectedValues = input.split(',').map((item) => item.trim()).filter(Boolean);
            }
        }

        if (field.required && selectedValues.length === 0) {
            return 'Bắt buộc chọn ít nhất 1 giá trị';
        }

        return null;
    }

    if (field.required && !input) {
        return 'Bắt buộc nhập';
    }

    if (!input) {
        return null;
    }

    if (field.type === 'text' || field.type === 'textarea') {
        if (validation.minLength !== undefined && input.length < validation.minLength) {
            return `Tối thiểu ${validation.minLength} ký tự`;
        }
        if (validation.maxLength !== undefined && input.length > validation.maxLength) {
            return `Tối đa ${validation.maxLength} ký tự`;
        }
        if (validation.pattern?.trim()) {
            try {
                if (!new RegExp(validation.pattern).test(input)) {
                    return 'Không đúng định dạng';
                }
            } catch {
                return 'Regex không hợp lệ';
            }
        }
    }

    if (field.type === 'number') {
        const n = Number(input);
        if (Number.isNaN(n)) {
            return 'Phải là số';
        }
        if (validation.min !== undefined && n < validation.min) {
            return `Tối thiểu: ${validation.min}`;
        }
        if (validation.max !== undefined && n > validation.max) {
            return `Tối đa: ${validation.max}`;
        }
    }

    return null;
};

export const mergeFieldsBySet = (
    selectedSetIds: string[],
    fieldSets: FieldSet[],
    fields: DynamicField[],
): DynamicField[] => {
    const merged = selectedSetIds.flatMap((setId) => {
        const fieldSet = fieldSets.find((set) => set.id === setId);
        if (!fieldSet) return [];
        if (fieldSet.fields && fieldSet.fields.length > 0) return fieldSet.fields;

        return (fieldSet.fieldIds ?? [])
            .map((fieldId) => fields.find((field) => field.id === fieldId))
            .filter((field): field is DynamicField => Boolean(field));
    });

    return merged.filter((field, index, arr) => arr.findIndex((item) => item.id === field.id) === index);
};

export const hasValidationRules = (field: DynamicField): boolean =>
    Object.values(field.validation ?? {}).some((value) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return value !== undefined && value !== '';
    });
