import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { clearAllLocalData } from '../../data/maintenance';
import { watchOwnAccess, type OwnAccess } from '../../sync/accessRepo';
import { firebase, isSyncConfigured } from '../../sync/firebase';

export type AccessReason = 'no-autorizado' | 'suspendida' | 'vencida' | 'sin-verificar';

export interface Access {
  state: 'loading' | 'unconfigured' | 'signedOut' | 'unverified' | 'blocked' | 'ok';
  user: User | null;
  isAdmin: boolean;
  reason?: AccessReason;
  paidUntil?: Date;
  offlineGrace?: boolean; // se está usando la última comprobación guardada (sin internet)
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const ADMIN_EMAIL = ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '').trim().toLowerCase();
// Solo en desarrollo (npm run dev): permite probar la interfaz sin Firebase
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH === 'true';
const OWNER_KEY = 'pdv.owner';
const GRACE_MS = 7 * 24 * 3600 * 1000; // días que se puede usar sin internet desde la última comprobación
const cacheKey = (uid: string) => `pdv.access.${uid}`;

function readCache(uid: string): { checkedAt: number; status: string; paidUntil: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AccessContext = createContext<Access>({
  state: 'loading', user: null, isAdmin: false, refresh: async () => {}, logout: async () => {},
});
export const useAccess = () => useContext(AccessContext);

// Se llama desde App: controla quién puede entrar (sesión, correo verificado y suscripción vigente)
export function useAccessState(): Access {
  const [user, setUser] = useState<User | null | undefined>(isSyncConfigured ? undefined : null);
  const [, setTick] = useState(0);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [own, setOwn] = useState<OwnAccess | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const uid = user?.uid;
  const email = user?.email?.toLowerCase() ?? '';
  const verified = !!user?.emailVerified;
  const isAdmin = verified && !!ADMIN_EMAIL && email === ADMIN_EMAIL;

  useEffect(() => {
    const f = firebase();
    if (!f) return;
    return onAuthStateChanged(f.auth, setUser);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);

  // Si en este dispositivo entra una cuenta distinta, se borran los datos locales de la anterior
  useEffect(() => {
    if (!uid || !verified) { setOwnerUid(null); return; }
    let cancelled = false;
    (async () => {
      const prev = localStorage.getItem(OWNER_KEY);
      if (prev && prev !== uid) await clearAllLocalData();
      localStorage.setItem(OWNER_KEY, uid);
      if (!cancelled) setOwnerUid(uid);
    })();
    return () => { cancelled = true; };
  }, [uid, verified]);

  // Estado de la suscripción de este correo, en tiempo real (si lo suspenden, se bloquea al momento)
  useEffect(() => {
    setOwn(null);
    if (!uid || !verified || isAdmin || !email) return;
    return watchOwnAccess(email, setOwn);
  }, [uid, verified, isAdmin, email]);

  // Guardar la última comprobación hecha con el servidor (para poder usar la app sin internet unos días)
  useEffect(() => {
    if (uid && own?.kind === 'found' && !own.fromCache) {
      localStorage.setItem(cacheKey(uid), JSON.stringify({
        checkedAt: Date.now(), status: own.row.status, paidUntil: own.row.paidUntil?.getTime() ?? 0,
      }));
    }
  }, [uid, own]);

  // Si no se logra comprobar y no hay comprobación guardada, no esperar para siempre
  useEffect(() => {
    setGaveUp(false);
    if (own?.kind !== 'unknown') return;
    const t = window.setTimeout(() => setGaveUp(true), 8000);
    return () => window.clearTimeout(t);
  }, [own]);

  const refresh = useCallback(async () => {
    const u = firebase()?.auth.currentUser;
    if (!u) return;
    await u.reload();
    if (u.emailVerified) await u.getIdToken(true); // actualizar la marca de "correo verificado" que revisan las reglas
    setTick((t) => t + 1);
  }, []);

  const logout = useCallback(async () => {
    const f = firebase();
    if (f) await signOut(f.auth);
  }, []);

  const result = (state: Access['state'], extra: Partial<Access> = {}): Access =>
    ({ user: user ?? null, isAdmin, refresh, logout, state, ...extra });

  if (DEV_BYPASS) return result('ok', { user: null, isAdmin: true });
  if (!isSyncConfigured) return result('unconfigured');
  if (user === undefined) return result('loading');
  if (!user) return result('signedOut');
  if (!verified) return result('unverified');
  if (ownerUid !== uid) return result('loading');
  if (isAdmin) return result('ok');
  if (!own) return result('loading');
  if (own.kind === 'none') return result('blocked', { reason: 'no-autorizado' });

  if (own.kind === 'found') {
    const { status, paidUntil } = own.row;
    if (status !== 'active') return result('blocked', { reason: 'suspendida', paidUntil });
    if (!paidUntil || paidUntil.getTime() < now) return result('blocked', { reason: 'vencida', paidUntil });
    return result('ok', { paidUntil });
  }

  // 'unknown': sin conexión o sin poder comprobar. Se usa la última comprobación guardada si es reciente.
  const cached = uid ? readCache(uid) : null;
  if (cached && now - cached.checkedAt < GRACE_MS && cached.status === 'active') {
    return result('ok', { paidUntil: cached.paidUntil ? new Date(cached.paidUntil) : undefined, offlineGrace: true });
  }
  if (!gaveUp) return result('loading');
  return result('blocked', { reason: 'sin-verificar' });
}
