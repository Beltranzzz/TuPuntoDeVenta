import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { firebase } from './firebase';

export type AccessStatus = 'active' | 'suspended';

// Un correo autorizado = un negocio cliente. El id del documento es el correo en minúsculas.
export interface AllowedEmail { email: string; status: AccessStatus; paidUntil?: Date; note?: string }

export type OwnAccess =
  | { kind: 'none' }                                         // el servidor confirma que no está autorizado
  | { kind: 'unknown' }                                      // sin conexión o sin poder comprobar
  | { kind: 'found'; row: AllowedEmail; fromCache: boolean };

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

// "YYYY-MM-DD" -> ese día a las 23:59:59 (hora local)
export function endOfDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59);
}

function fsOrThrow() {
  const f = firebase();
  if (!f) throw new Error('Firebase no está configurado');
  return f.fs;
}

function toRow(id: string, data: DocumentData): AllowedEmail {
  const p = data.paidUntil as Timestamp | undefined;
  return {
    email: id,
    status: data.status === 'suspended' ? 'suspended' : 'active',
    paidUntil: p?.toDate ? p.toDate() : undefined,
    note: typeof data.note === 'string' && data.note ? data.note : undefined,
  };
}

// Lo que ve cada cliente: solo su propio registro
export function watchOwnAccess(email: string, onData: (a: OwnAccess) => void): Unsubscribe {
  return onSnapshot(
    doc(fsOrThrow(), 'allowedEmails', normalizeEmail(email)),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists()) onData({ kind: 'found', row: toRow(snap.id, snap.data()), fromCache: snap.metadata.fromCache });
      else onData(snap.metadata.fromCache ? { kind: 'unknown' } : { kind: 'none' });
    },
    () => onData({ kind: 'unknown' })
  );
}

// Administrador: ver, autorizar, suspender y quitar correos
export function watchAllowedEmails(onData: (rows: AllowedEmail[]) => void, onError: (e: unknown) => void): Unsubscribe {
  return onSnapshot(collection(fsOrThrow(), 'allowedEmails'), (snap) => onData(snap.docs.map((d) => toRow(d.id, d.data()))), onError);
}

export async function saveAllowedEmail(email: string, v: { status: AccessStatus; paidUntil: Date; note?: string }) {
  const id = normalizeEmail(email);
  return setDoc(
    doc(fsOrThrow(), 'allowedEmails', id),
    { email: id, status: v.status, paidUntil: Timestamp.fromDate(v.paidUntil), note: v.note?.trim() ?? '', updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export const removeAllowedEmail = async (email: string) => deleteDoc(doc(fsOrThrow(), 'allowedEmails', normalizeEmail(email)));
