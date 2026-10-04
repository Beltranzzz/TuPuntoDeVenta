import * as XLSX from 'xlsx';
import { runtime } from '../config/runtime';
import type { ProfitRow, ProfitTotals } from '../domain/profitReport';

const MONEY = '"$"#,##0.00';

function format(ws: XLSX.WorkSheet, col: number, fromRow: number, toRow: number, z: string) {
  for (let r = fromRow; r <= toRow; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    if (cell && cell.t === 'n') cell.z = z;
  }
}

export function buildProfitWorkbook(rows: ProfitRow[], totals: ProfitTotals, periodLabel: string): XLSX.WorkBook {
  const pesos = (c: number | null) => (c === null ? '' : c / 100);
  const aoa = [
    [`${runtime.businessName} - Utilidad por artículo`],
    ['Periodo', periodLabel],
    [],
    ['Código', 'Artículo', 'Cantidad', 'Precio venta', 'Importe', 'Costo', 'Utilidad', 'Margen'],
    ...rows.map((r) => [r.code, r.name, r.units, r.price / 100, r.revenue / 100, pesos(r.cost), pesos(r.profit), r.margin ?? '']),
    ['', 'Totales', totals.units, '', totals.revenue / 100, totals.cost / 100, totals.profit / 100, totals.margin ?? ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const first = 4;
  const last = 4 + rows.length; // incluye la fila de totales
  [3, 4, 5, 6].forEach((c) => format(ws, c, first, last, MONEY));
  format(ws, 7, first, last, '0%');
  ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Utilidad por artículo');
  return wb;
}
