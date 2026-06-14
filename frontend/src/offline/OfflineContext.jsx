import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as db from "./db";
import { flushOutbox, discardFailed } from "./sync";

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  const [version, setVersion] = useState(0);

  const refreshCounts = useCallback(async () => {
    const all = await db.outboxAll();
    setPending(all.filter((e) => e.status === "pending").length);
    setFailed(all.filter((e) => e.status === "failed").length);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const result = await flushOutbox();
      await refreshCounts();
      if (result.synced > 0 || result.failed > 0) setVersion((v) => v + 1);
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshCounts]);

  const clearFailed = useCallback(async () => {
    await discardFailed();
    await refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    refreshCounts();
    function goOnline() {
      setOnline(true);
      sync();
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };

  }, []);

  const value = useMemo(
    () => ({ online, syncing, pending, failed, version, sync, clearFailed, refreshCounts }),
    [online, syncing, pending, failed, version, sync, clearFailed, refreshCounts]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
