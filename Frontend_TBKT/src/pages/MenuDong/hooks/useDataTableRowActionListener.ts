import { useEffect } from "react";
import type { RuntimeDataTableRowActionEvent } from "../types";

type UseDataTableRowActionListenerParams = {
  onView: (row: Record<string, unknown>) => void;
  onEdit: (row: Record<string, unknown>, sourceKey?: string | null) => Promise<void>;
  onDelete: (row: Record<string, unknown>, sourceKey?: string | null) => Promise<void>;
  onPrint: (row: Record<string, unknown>) => void;
  onExport: (row: Record<string, unknown>) => void;
};

export const useDataTableRowActionListener = ({
  onView,
  onEdit,
  onDelete,
  onPrint,
  onExport,
}: UseDataTableRowActionListenerParams): void => {
  useEffect(() => {
    const onDataTableRowAction = async (evt: Event) => {
      const event = evt as CustomEvent<RuntimeDataTableRowActionEvent>;
      const action = String(event.detail?.action || "")
        .trim()
        .toLowerCase();
      const row = (event.detail?.row || {}) as Record<string, unknown>;
      if (!action) return;
      if (action === "view") {
        onView(row);
        return;
      }
      const sourceKey = event.detail?.sourceKey;
      if (action === "edit") {
        await onEdit(row, sourceKey);
        return;
      }
      if (action === "delete") {
        await onDelete(row, sourceKey);
        return;
      }
      if (action === "print") {
        onPrint(row);
        return;
      }
      if (action === "export") {
        onExport(row);
      }
    };

    window.addEventListener(
      "template:datatable:row-action",
      onDataTableRowAction as EventListener,
    );
    return () => {
      window.removeEventListener(
        "template:datatable:row-action",
        onDataTableRowAction as EventListener,
      );
    };
  }, [onDelete, onEdit, onExport, onPrint, onView]);
};