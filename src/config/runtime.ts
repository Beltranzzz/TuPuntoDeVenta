import type { Settings } from '../domain/settings';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PRODUCT_CATEGORIES } from './constants';
import { applyTheme } from './theme';

// Valores de configuración que necesitan funciones fuera de React (formato de dinero, títulos)
export const runtime = { businessName: 'Tu punto de venta', currency: 'MXN' };

const replace = <T>(target: T[], next: T[]) => { target.splice(0, target.length, ...next); };

let last: Settings | null = null;
let listening = false;

export function applySettings(s: Settings) {
  last = s;
  runtime.businessName = s.businessName;
  runtime.currency = s.currency;
  replace(PAYMENT_METHODS, s.paymentMethods);
  replace(EXPENSE_CATEGORIES, s.expenseCategories);
  replace(PRODUCT_CATEGORIES, s.productCategories);
  applyTheme(s);
  document.title = s.businessName;

  // En modo automático, seguir los cambios del sistema (claro/oscuro)
  if (!listening) {
    listening = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (last) applyTheme(last); });
  }
}
