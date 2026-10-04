import { db } from './db';

// Borra todos los datos guardados en este dispositivo (se usa cuando entra otra cuenta distinta)
export async function clearAllLocalData() {
  await db.transaction('rw', [db.sales, db.expenses, db.products, db.settings], async () => {
    await Promise.all([db.sales.clear(), db.expenses.clear(), db.products.clear(), db.settings.clear()]);
  });
}
