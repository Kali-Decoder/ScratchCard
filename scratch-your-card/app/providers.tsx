"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";
import { ReactivityStatusProvider } from "./contexts/ReactivityStatusContext";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ReactivityStatusProvider>
          {children}
          <ToastContainerWrapper />
        </ReactivityStatusProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
