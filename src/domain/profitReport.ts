import type { Entry } from './entry';
import type { Product } from './models';

export interface ProfitRow {
  key: string;
  code: string;             // código/SKU del producto (si lo tiene)
  name: string;
  catalog: boolean;         // true = producto del catálogo; false = venta escrita a mano
  units: number;
  price: number;            // precio de venta promedio por unidad (centavos)
  revenue: number;          // importe vendido (centavos)
  cost: number | null;      // costo de lo vendido (null = sin costo conocido)
  profit: number | null;    // utilidad = importe - costo (null = sin costo conocido)
  margin: number | null;    // utilidad / importe
}

export interface ProfitTotals { units: number; revenue: number; cost: number; profit: number; margin: number | null }

const norm = (s: string) => s.trim().toLowerCase();

// Agrupa las ventas por artículo. El costo es el que tenía el producto al momento de vender.
// Las ventas escritas a mano (sin producto del catálogo) no tienen costo: se muestran, pero sin utilidad.
export function buildProfitTable(entries: Entry[], products: Product[]): ProfitRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const acc = new Map<string, { code: string; name: string; catalog: boolean; units: number; revenue: number; cost: number; costKnown: boolean }>();

  for (const e of entries) {
    if (e.kind !== 'venta') continue;
    const p = e.productId ? byId.get(e.productId) : undefined;
    const key = e.productId ? `p:${e.productId}` : `m:${norm(e.concept)}`;
    const unitCost = e.unitCost ?? p?.cost;
    const row = acc.get(key) ?? {
      code: p?.sku ?? '', name: p?.name ?? e.concept, catalog: !!e.productId,
      units: 0, revenue: 0, cost: 0, costKnown: !!e.productId,
    };
    row.units += e.quantity;
    row.revenue += e.total;
    if (unitCost === undefined) row.costKnown = false;
    else row.cost += Math.round(unitCost * e.quantity);
    acc.set(key, row);
  }

  return [...acc.entries()].map(([key, r]) => {
    const cost = r.costKnown ? r.cost : null;
    const profit = cost === null ? null : r.revenue - cost;
    return {
      key, code: r.code, name: r.name, catalog: r.catalog, units: r.units,
      price: r.units ? Math.round(r.revenue / r.units) : 0,
      revenue: r.revenue, cost, profit,
      margin: profit !== null && r.revenue > 0 ? profit / r.revenue : null,
    };
  });
}

// Totales: cantidad e importe cuentan todo; costo, utilidad y margen solo los artículos con costo conocido
export function sumProfitRows(rows: ProfitRow[]): ProfitTotals {
  let units = 0, revenue = 0, cost = 0, profit = 0, revenueWithCost = 0;
  for (const r of rows) {
    units += r.units;
    revenue += r.revenue;
    if (r.cost !== null && r.profit !== null) {
      cost += r.cost;
      profit += r.profit;
      revenueWithCost += r.revenue;
    }
  }
  return { units, revenue, cost, profit, margin: revenueWithCost > 0 ? profit / revenueWithCost : null };
}
