import type { NavigateFunction } from 'react-router-dom';
import notify from '../../../utils/notification';

export type TemplateButtonIntent =
  | 'navigate'
  | 'api_call'
  | 'print_list'
  | 'import_list'
  | 'export_list'
  | 'refresh'
  | 'custom';

export interface TemplateButtonActionConfig {
  intent?: TemplateButtonIntent;
  href?: string;
  endpoint?: string;
  payloadJson?: string;
  confirmMessage?: string;
  successMessage?: string;
  failureMessage?: string;
  actionKey?: string;
}

interface ExecuteTemplateButtonActionParams {
  config: TemplateButtonActionConfig;
  navigate: NavigateFunction;
}

const safeJsonParse = (raw: string | undefined): unknown => {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Payload JSON khong hop le');
  }
};

const dispatchTemplateActionEvent = (type: string, detail: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent(type, { detail }));
};

export const executeTemplateButtonAction = async ({
  config,
  navigate,
}: ExecuteTemplateButtonActionParams): Promise<void> => {
  const {
    intent = 'navigate',
    href,
    endpoint,
    payloadJson,
    confirmMessage,
    successMessage,
    failureMessage,
    actionKey,
  } = config;

  if (confirmMessage?.trim()) {
    const ok = window.confirm(confirmMessage);
    if (!ok) return;
  }

  try {
    switch (intent) {
      case 'navigate': {
        if (href?.trim()) navigate(href.trim());
        return;
      }

      case 'api_call': {
        safeJsonParse(payloadJson);
        dispatchTemplateActionEvent('template:button:intent', {
          intent,
          endpoint,
          payloadJson: payloadJson || null,
          actionKey: actionKey || null,
        });
        return;
      }

      case 'print_list':
      case 'import_list':
      case 'export_list': {
        dispatchTemplateActionEvent('template:button:intent', {
          intent,
          actionKey: actionKey || null,
          endpoint: endpoint || null,
          payloadJson: payloadJson || null,
        });
        return;
      }

      case 'custom': {
        dispatchTemplateActionEvent('template:button:intent', {
          intent,
          actionKey: actionKey || null,
          endpoint: endpoint || null,
          payloadJson: payloadJson || null,
        });
        notify.info(successMessage || 'Da phat su kien custom action');
        return;
      }

      case 'refresh': {
        window.location.reload();
        return;
      }

      default: {
        const exhaustiveCheck: never = intent;
        throw new Error(`Intent khong ho tro: ${exhaustiveCheck}`);
      }
    }
  } catch (error) {
    notify.error(failureMessage || (error as Error).message || 'Thuc hien thao tac that bai');
    throw error;
  }
};
