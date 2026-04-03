import React, { createContext, useContext } from 'react';

export type TemplateRuntimeContextValue = {
  isRuntime?: boolean;
  defaultSourceKey?: string;
  defaultColumnLabels?: Record<string, string>;
  defaultColumns?: Array<{ key: string; name: string }>;
  permissionCode?: string;
};

const TemplateRuntimeContext = createContext<TemplateRuntimeContextValue | null>(null);

export const TemplateRuntimeProvider = TemplateRuntimeContext.Provider;

export const useTemplateRuntimeContext = (): TemplateRuntimeContextValue => {
  return useContext(TemplateRuntimeContext) || {};
};
