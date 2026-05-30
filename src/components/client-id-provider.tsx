"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "hotpot-client-id";

interface ClientIdContextValue {
  clientId: string | null;
  loading: boolean;
  displayName: string | null;
  setDisplayName: (name: string) => void;
}

const ClientIdContext = createContext<ClientIdContextValue>({
  clientId: null,
  loading: true,
  displayName: null,
  setDisplayName: () => {},
});

/** Hook to read client identity in any component. Replaces useEazo(). */
export function useClientId() {
  return useContext(ClientIdContext);
}

export function ClientIdProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState<string | null>(null);

  useEffect(() => {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    setClientId(id);

    const name = window.localStorage.getItem("hotpot-display-name");
    if (name) setDisplayNameState(name);

    setLoading(false);
  }, []);

  const setDisplayName = (name: string) => {
    window.localStorage.setItem("hotpot-display-name", name);
    setDisplayNameState(name);
  };

  return (
    <ClientIdContext.Provider value={{ clientId, loading, displayName, setDisplayName }}>
      {children}
    </ClientIdContext.Provider>
  );
}
