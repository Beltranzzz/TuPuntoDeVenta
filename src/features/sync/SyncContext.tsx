import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { isSyncConfigured } from '../../sync/firebase';
import { startSync, type SyncStatus } from '../../sync/syncEngine';

interface SyncCtx {
  configured: boolean;
  status: SyncStatus;
  syncNow: () => void;
}

export const SyncContext = createContext<SyncCtx>({ configured: false, status: { state: 'idle' }, syncNow: () => {} });
export const useSync = () => useContext(SyncContext);

// La sincronización arranca solo cuando hay un usuario con acceso vigente (lo decide AccessContext)
export function useSyncState(user: User | null): SyncCtx {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const flushRef = useRef<() => void>(() => {});

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) { setStatus({ state: 'idle' }); return; }
    setStatus({ state: 'syncing' });
    const s = startSync(uid, setStatus);
    flushRef.current = s.flushNow;
    return () => { s.stop(); flushRef.current = () => {}; };
  }, [uid]);

  return { configured: isSyncConfigured, status, syncNow: () => flushRef.current() };
}
