"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ToastItem({ t, onClose }) {
  const base =
    "pointer-events-auto max-w-[92vw] sm:max-w-[520px] w-full rounded-2xl border px-4 py-3 shadow-lg backdrop-blur bg-white/95";
  const tone =
    t.type === "success"
      ? "border-emerald-200 text-emerald-800"
      : t.type === "error"
      ? "border-red-200 text-red-700"
      : "border-gray-200 text-gray-800";

  return (
    <div className={cx(base, tone)}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {t.title ? <div className="font-semibold leading-5">{t.title}</div> : null}
          {t.message ? <div className="text-sm leading-5 opacity-90">{t.message}</div> : null}
        </div>

        <button
          type="button"
          onClick={() => onClose(t.id)}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50"
          aria-label="Close toast"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = timersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ type = "success", title = "", message = "", duration = 2400 } = {}) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const toast = { id, type, title, message };
      setToasts((prev) => [toast, ...prev].slice(0, 3));

      if (duration && duration > 0) {
        const timer = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, opts = {}) => push({ type: "success", message, ...opts }),
      error: (message, opts = {}) => push({ type: "error", message, ...opts }),
      info: (message, opts = {}) => push({ type: "info", message, ...opts }),
      remove,
      clear: () => setToasts([]),
    }),
    [push, remove]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed left-1/2 top-4 z-[9999] w-full -translate-x-1/2 px-3 sm:px-0">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} t={t} onClose={remove} />
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}