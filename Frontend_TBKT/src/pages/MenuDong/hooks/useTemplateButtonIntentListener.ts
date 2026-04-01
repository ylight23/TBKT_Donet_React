import { useEffect, type RefObject } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store";
import {
  exportListThunk,
  importListThunk,
  printListThunk,
  type RuntimeActionPayload,
} from "../../../store/reducer/templateRuntimeAction";
import type { RuntimeIntentEvent } from "../types";

type UseTemplateButtonIntentListenerParams = {
  importInputRef: RefObject<HTMLInputElement | null>;
  openCreateDialog: (detail: RuntimeIntentEvent) => Promise<void>;
};

export const useTemplateButtonIntentListener = ({
  importInputRef,
  openCreateDialog,
}: UseTemplateButtonIntentListenerParams): void => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const pickFile = () =>
      new Promise<File | null>((resolve) => {
        const input = importInputRef.current;
        if (!input) {
          resolve(null);
          return;
        }
        input.value = "";
        const handleChange = () => {
          const file = input.files?.[0] || null;
          input.removeEventListener("change", handleChange);
          resolve(file);
        };
        input.addEventListener("change", handleChange, { once: true });
        input.click();
      });

    const onIntent = async (evt: Event) => {
      const event = evt as CustomEvent<unknown>;
      const detail = event.detail as RuntimeIntentEvent;
      if (!detail?.intent) return;
      const withTemplate: RuntimeIntentEvent = { ...detail };

      if (
        withTemplate.intent === "custom" &&
        (withTemplate.actionKey || "").toLowerCase() === "create_item"
      ) {
        await openCreateDialog(withTemplate);
        return;
      }

      if (withTemplate.intent === "export_list") {
        await dispatch(
          exportListThunk(withTemplate as RuntimeActionPayload),
        ).unwrap();
        return;
      }

      if (withTemplate.intent === "api_call") {
        await dispatch(
          exportListThunk({ ...(withTemplate as any), intent: "export_list" }),
        ).unwrap();
        return;
      }

      if (withTemplate.intent === "print_list") {
        await dispatch(
          printListThunk(withTemplate as RuntimeActionPayload),
        ).unwrap();
        return;
      }

      if (withTemplate.intent === "import_list") {
        const file = await pickFile();
        if (!file) return;
        await dispatch(
          importListThunk({ ...(withTemplate as RuntimeActionPayload), file }),
        ).unwrap();
      }
    };

    window.addEventListener("template:button:intent", onIntent as EventListener);
    return () => {
      window.removeEventListener(
        "template:button:intent",
        onIntent as EventListener,
      );
    };
  }, [dispatch, importInputRef, openCreateDialog]);
};