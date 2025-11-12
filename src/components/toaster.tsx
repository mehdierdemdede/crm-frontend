"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { ToastContainer, type ToastMessage } from "./Toast";

const EVENT_NAME = "crm:toast";

type ToastEventDetail = Omit<ToastMessage, "id"> & { id?: string };

function normalise(detail: ToastEventDetail): ToastMessage {
  const id =
    detail.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));

  return {
    id,
    ...detail,
  };
}

export function dispatchToast(detail: ToastEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  const toast = normalise(detail);
  window.dispatchEvent(new CustomEvent<ToastMessage>(EVENT_NAME, { detail: toast }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ToastMessage>;
      const toast = customEvent.detail;
      setToasts((prev) => [...prev, toast]);
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);

    return () => {
      window.removeEventListener(EVENT_NAME, handler as EventListener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const rendered = useMemo(() => {
    if (toasts.length === 0) {
      return null;
    }

    return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
  }, [dismiss, toasts]);

  if (typeof document === "undefined" || rendered === null) {
    return null;
  }

  return createPortal(rendered, document.body);
}
