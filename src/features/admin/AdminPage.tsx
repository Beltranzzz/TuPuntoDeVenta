import { useEffect, useState } from 'react';
import { dateKey } from '../../lib/dates';
import {
  endOfDay, normalizeEmail, removeAllowedEmail, saveAllowedEmail, watchAllowedEmails, type AllowedEmail,
} from '../../sync/accessRepo';
import { useAccess } from '../access/AccessContext';

const DAY = 24 * 3600 * 1000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const fmt = (d?: Date) => (d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'sin fecha');
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

function statusOf(r: AllowedEmail, now: number): { label: string; cls: 'ok' | 'warn' | 'bad' } {
  if (r.status === 'suspended') return { label: 'Suspendida', cls: 'bad' };
  if (!r.paidUntil || r.paidUntil.getTime() < now) return { label: 'Vencida', cls: 'bad' };
  const days = Math.ceil((r.paidUntil.getTime() - now) / DAY);
  return days <= 5 ? { label: `Vence en ${days} ${days === 1 ? 'día' : 'días'}`, cls: 'warn' } : { label: 'Activa', cls: 'ok' };
}

function EditModal({ row, onClose }: { row: AllowedEmail; onClose: () => void }) {
  const [until, setUntil] = useState(dateKey(row.paidUntil ?? new Date()));
  const [note, setNote] = useState(row.note ?? '');
  const [error, setError] = useState('');
  async function save() {
    try {
      await saveAllowedEmail(row.email, { status: row.status, paidUntil: endOfDay(until), note });
      onClose();
    } catch (e) {
      setError(errText(e));
    }
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Editar cliente">
        <header><h2>Editar cliente</h2><button className="x" onClick={onClose} aria-label="Cerrar">✕</button></header>
        <p className="meta" style={{ marginTop: 0 }}>{row.email}</p>
        {error && <div className="toast error">{error}</div>}
        <div className="field"><label>Pagado hasta</label>
          <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
        <div className="field"><label>Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Abarrotes Lupita, paga por transferencia" />
        </div>
        <button className="save" disabled={!until} onClick={() => void save()}>GUARDAR</button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { isAdmin } = useAccess();
  const [rows, setRows] = useState<AllowedEmail[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [until, setUntil] = useState(dateKey(addDays(new Date(), 30)));
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<AllowedEmail | null>(null);
  const [removing, setRemoving] = useState<AllowedEmail | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      return watchAllowedEmails(setRows, (e) => setError(`No se pudo leer la lista: ${errText(e)}`));
    } catch (e) {
      setError(`No se pudo leer la lista: ${errText(e)}`);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="card"><h2>Sin permiso</h2><p className="empty">Esta sección es solo para el administrador.</p></div>;
  }

  const now = Date.now();
  const list = [...(rows ?? [])]
    .filter((r) => `${r.email} ${r.note ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.email.localeCompare(b.email));
  const active = (rows ?? []).filter((r) => statusOf(r, now).cls !== 'bad').length;

  const run = async (p: Promise<unknown>) => {
    try { setError(''); await p; } catch (e) { setError(errText(e)); }
  };

  async function add() {
    const e = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(e)) { setError('Escribe un correo válido.'); return; }
    await run(saveAllowedEmail(e, { status: 'active', paidUntil: endOfDay(until), note }));
    setEmail(''); setNote('');
  }

  const extend = (r: AllowedEmail) =>
    run(saveAllowedEmail(r.email, {
      status: r.status,
      paidUntil: endOfDay(dateKey(addDays(new Date(Math.max(Date.now(), r.paidUntil?.getTime() ?? 0)), 30))),
      note: r.note,
    }));

  const toggle = (r: AllowedEmail) =>
    run(saveAllowedEmail(r.email, {
      status: r.status === 'active' ? 'suspended' : 'active',
      paidUntil: r.paidUntil ?? endOfDay(dateKey(new Date())),
      note: r.note,
    }));

  return (
    <>
      <h1>Administración</h1>
      <p className="date">Quién puede usar la app. Solo los correos de esta lista pueden entrar.</p>

      <div className="card">
        <h2>Autorizar un correo</h2>
        <div className="field"><label>Correo del cliente</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" />
        </div>
        <div className="filters-grid">
          <div className="field"><label>Pagado hasta</label>
            <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <div className="field"><label>Nota (opcional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nombre del negocio" />
          </div>
        </div>
        <button className="save" disabled={!email} onClick={() => void add()}>AUTORIZAR CORREO</button>
      </div>

      {error && <div className="toast error" style={{ marginTop: 14 }}>{error}</div>}

      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="summary">{rows === null ? 'Cargando…' : `${rows.length} ${rows.length === 1 ? 'cliente' : 'clientes'} · ${active} con acceso vigente`}</p>

      <div className="list">
        {list.map((r) => {
          const st = statusOf(r, now);
          return (
            <div className="card" key={r.email}>
              <b>{r.email}</b><span className={`tag ${st.cls}`}>{st.label}</span>
              <small className="meta">Pagado hasta: {fmt(r.paidUntil)}</small>
              {r.note && <small className="meta">📝 {r.note}</small>}
              <div className="entry-actions" style={{ flexWrap: 'wrap' }}>
                <button className="mini" onClick={() => void extend(r)}>+30 días</button>
                <button className="mini" onClick={() => void toggle(r)}>{r.status === 'active' ? 'Suspender' : 'Activar'}</button>
                <button className="mini" onClick={() => setEditing(r)}>✏️ Editar</button>
                <button className="mini danger" onClick={() => setRemoving(r)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
      {rows !== null && list.length === 0 && <div className="card"><p className="empty">{rows.length === 0 ? 'Aún no has autorizado ningún correo.' : 'Sin resultados.'}</p></div>}

      {editing && <EditModal key={editing.email} row={editing} onClose={() => setEditing(null)} />}

      {removing && (
        <div className="overlay" onClick={() => setRemoving(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Quitar correo">
            <header><h2>¿Quitar este correo?</h2></header>
            <p className="empty">{removing.email} perderá el acceso a la app en cuanto se conecte. Sus datos en la nube no se borran.</p>
            <div className="quick">
              <button className="save danger-btn" onClick={() => { const r = removing; setRemoving(null); void run(removeAllowedEmail(r.email)); }}>QUITAR</button>
              <button className="big cancel" onClick={() => setRemoving(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
