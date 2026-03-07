import React from 'react';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'checkboxGroup';

export interface FieldValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
    dataSource?: 'manual' | 'api' | 'country';
    apiUrl?: string;
    displayType?: 'dropdown' | 'tabs' | 'tree' | 'autocomplete';
}

// Local FieldSet uses React.ReactNode for the icon to support JSX icons in the UI
export interface FieldSet {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    desc?: string;
    fieldIds: string[];
}

export type LogType = 'bao_quan' | 'bao_duong' | 'sua_chua' | 'niem_cat' | 'dieu_dong' | 'gio_su_dung';
export type LogTypeEntry = [LogType, { label: string; color: string; icon: React.ReactNode; fields: string[] }];

export interface TechParam {
    id: string;
    key: string;
    value: string;
}

export interface EquipmentLog {
    id: string;
    type: LogType;
    date: string;
    performedBy: string;
    data: Record<string, string>;
}

export interface EquipmentItem {
    id: string;
    selectedSetIds: string[];
    data: Record<string, string>;
    techParams: TechParam[];
    syncEquipment: string[];
    logs: EquipmentLog[];
}

export type MainTab = 'fields' | 'datasets' | 'equip';
