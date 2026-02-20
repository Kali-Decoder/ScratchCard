"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type ReactivityStatus = "idle" | "processing";

type ReactivityStatusContextType = {
  status: ReactivityStatus;
  setStatus: (status: ReactivityStatus) => void;
};

const ReactivityStatusContext = createContext<ReactivityStatusContextType | undefined>(undefined);

export function ReactivityStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ReactivityStatus>("idle");

  const value = useMemo(() => ({ status, setStatus }), [status]);

  return (
    <ReactivityStatusContext.Provider value={value}>
      {children}
    </ReactivityStatusContext.Provider>
  );
}

export function useReactivityStatus() {
  const context = useContext(ReactivityStatusContext);
  if (!context) {
    throw new Error("useReactivityStatus must be used inside ReactivityStatusProvider");
  }
  return context;
}
