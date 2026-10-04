import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { runtime } from '../../config/runtime';
import { productsRepo } from '../../data/repositories';
import type { Entry } from '../../domain/entry';
import { resolvePeriod, type PeriodId } from '../../domain/periods';
import { buildProfitTable, sumProfitRows, type ProfitRow } from '../../domain/profitReport';
import { loadEntries } from '../../domain/services/ledgerQuery';
import { buildProfitWorkbook } from '../../export/buildProfitWorkbook';
import { saveWorkbook } from '../../export/saveFile';
import { dateKey } from '../../lib/dates';
import { money } from '../../lib/money';

type SortKey = 'code' | 'name' | 'units' | 'price' | 'revenue' | 'cost' | 'profit' | 'margin';

const COLS: { key: SortKey; label: string; left?: boolean }[] = [
  { key: 'code', label: 'Código', left: true },
  { key: 'name', label: 'Artículo', left: true },
  { key: 'units', label: 'Cantidad' },
  { key: 'price', label: 'Precio venta' },
  { key: 'revenue', label: 'Importe' },
  { key: 'cost', label: 'Costo' },
  { key: 'profit', label: 'Utilidad' },
  { key: 'margin', label: 'Margen' },
];

const CHIPS: [PeriodId, string][] = [
  ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['mesAnterior', 'Mes anterior'], ['todo', 'Todo'],
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const pct = (m: number | null) => (m === null ? '—' : `${Math.round(m * 100)}%`);

function valueOf(r: ProfitRow, k: SortKey): string | number | null {
  switch (k) {
    case 'code': return r.code.toLowerCase();
    case 'name': return r.name.toLowerCase();
    case 'units': return r.units;
    case 'price': return r.price;
    case 'revenue': return r.revenue;
    case 'cost': return r.cost;
    case 'profit': return r.profit;
    default: return r.margin;
  }
}

function compare(a: ProfitRow, b: ProfitRow, key: SortKey, dir: 'asc' | 'desc') {
  const x = valueOf(a, key);
  const y = valueOf(b, key);
  if (x === null && y === null) return 0;
  if (x === null) return 1; // lo que no tiene dato va siempre al final
  if (y === null) return -1;
  const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'es') : Number(x) - Number(y);
  return dir === 'asc' ? c : -c;
}

export function ProfitReport() {
  const initial = resolvePeriod('mes');
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'profit', dir: 'desc' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const invalid = !!from && !!to && from > to;
  const entries = useLiveQuery(
    () => (invalid ? Promise.resolve([] as Entry[]) : loadEntries({ from: from || undefined, to: to || undefined })),
    [from, to, invalid]
  );
  const products = useLiveQuery(() => productsRepo.all(), []);

  const table = useMemo(() => buildProfitTable(entries ?? [], products ?? []), [entries, products]);
  const q = norm(search.trim());
  const rows = useMemo(
    () => table.filter((r) => !q || norm(`${r.code} ${r.name}`).includes(q)).sort((a, b) => compare(a, b, sort.key, sort.dir)),
    [table, q, sort]
  );
  const totals = useMemo(() => sumProfitRows(rows), [rows]);

  const periodLabel = from || to ? `${from || 'inicio'} a ${to || 'hoy'}` : 'Todo el historial';
  const activeChip = CHIPS.find(([id]) => {
    const r = resolvePeriod(id);
    return (r.from ?? '') === from && (r.to ?? '') === to;
  })?.[0];

  const pick = (id: PeriodId) => {
    const r = resolvePeriod(id);
    setFrom(r.from ?? '');
    setTo(r.to ?? '');
  };

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'code' || key === 'name' ? 'asc' : 'desc' }));

  async function exportExcel() {
    setMsg(null);
    try {
      await saveWorkbook(buildProfitWorkbook(rows, totals, periodLabel), `PuntoDeVenta_utilidad_${dateKey()}.xlsx`);
      setMsg({ ok: true, text: '✓ Archivo de Excel generado' });
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}` });
    }
  }

  return (
    <>
      <div className="print-only">
        <h1>{runtime.businessName}</h1>
        <p>Utilidad por artículo · {periodLabel}</p>
      </div>

      <h1 className="no-print">Utilidad por artículo</h1>
      <p className="date no-print">Cuánto vendiste de cada producto y cuánto ganaste.</p>

      <div className="card no-print">
        <div className="chips">
          {CHIPS.map(([id, label]) => (
            <button key={id} className={`chip ${activeChip === id ? 'on' : ''}`} onClick={() => pick(id)}>{label}</button>
          ))}
        </div>
        <div className="filters-grid" style={{ marginTop: 14 }}>
          <div className="field"><label>Fecha inicial</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field"><label>Fecha final</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Buscar artículo</label>
          <input className="input" type="search" placeholder="Nombre o código" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="entry-actions">
          <button className="mini" onClick={() => void exportExcel()} disabled={rows.length === 0}>📤 Exportar</button>
          <button className="mini" onClick={() => window.print()} disabled={rows.length === 0}>📄 PDF</button>
        </div>
      </div>

      {invalid && <div className="toast error no-print" style={{ marginTop: 14 }}>La fecha inicial no puede ser posterior a la final.</div>}
      {msg && <div className={`toast no-print ${msg.ok ? '' : 'error'}`} style={{ marginTop: 14 }}>{msg.text}</div>}

      {rows.length === 0 ? (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="empty">{table.length === 0 ? 'No hay ventas en este periodo.' : 'Ningún artículo coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="tbl-wrap" style={{ marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className={`${c.left ? 'left' : ''} ${c.key === 'name' ? 'sticky' : ''}`}
                    aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button className="th-btn" onClick={() => toggle(c.key)}>
                      {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={r.cost === null ? 'nocost' : ''}>
                  <td className="left">{r.code || '—'}</td>
                  <td className="left sticky name">
                    {r.name}
                    {!r.catalog && <small className="meta">sin producto del catálogo</small>}
                  </td>
                  <td>{r.units}</td>
                  <td>{money(r.price)}</td>
                  <td>{money(r.revenue)}</td>
                  <td>{r.cost === null ? '—' : money(r.cost)}</td>
                  <td className={r.profit === null ? '' : r.profit >= 0 ? 'pos' : 'neg'}><b>{r.profit === null ? '—' : money(r.profit)}</b></td>
                  <td>{pct(r.margin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="left">Totales</td>
                <td className="left sticky" />
                <td>{totals.units}</td>
                <td />
                <td>{money(totals.revenue)}</td>
                <td>{money(totals.cost)}</td>
                <td>{money(totals.profit)}</td>
                <td>{pct(totals.margin)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="empty">
        Utilidad = importe − costo del producto al momento de la venta. Las ventas escritas a mano, sin elegir un producto, no tienen costo:
        se muestran, pero no cuentan en el costo ni en la utilidad total. Desliza la tabla hacia los lados para ver todas las columnas.
      </p>
    </>
  );
}
