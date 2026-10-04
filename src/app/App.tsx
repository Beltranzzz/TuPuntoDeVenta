import { useEffect, useState } from 'react';
import { AccessContext, useAccess, useAccessState } from '../features/access/AccessContext';
import { AuthScreens } from '../features/access/AuthScreens';
import { AdminPage } from '../features/admin/AdminPage';
import { Calendar } from '../features/calendar/Calendar';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ExportPage } from '../features/export/ExportPage';
import { History } from '../features/history/History';
import { Products } from '../features/products/Products';
import { EntryModal } from '../features/quick-entry/EntryModal';
import { Reports } from '../features/reports/Reports';
import { SettingsContext, useSettings, useSettingsState } from '../features/settings/SettingsContext';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SyncContext, useSyncState } from '../features/sync/SyncContext';
import { brandInitial } from '../lib/brand';

const TABS = [
  { hash: '#/', icon: '🏠', label: 'Inicio' },
  { hash: '#/registrar', icon: '➕', label: 'Registrar' },
  { hash: '#/calendario', icon: '📅', label: 'Calendario' },
  { hash: '#/reportes', icon: '📊', label: 'Reportes' },
  { hash: '#/mas', icon: '⚙️', label: 'Más' },
];

// Pantallas que viven dentro de "Más"
const MORE_SECTIONS = ['#/registro', '#/productos', '#/exportar', '#/configuracion', '#/admin'];

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function More() {
  const { isAdmin } = useAccess();
  return (
    <>
      <h1>Más</h1>
      <div className="card" style={{ marginTop: 14 }}>
        <ul className="more-list">
          <li><a href="#/registro"><span>📋 Registro</span><span>›</span></a></li>
          <li><a href="#/productos"><span>🏷️ Productos</span><span>›</span></a></li>
          <li><a href="#/exportar"><span>📤 Exportar</span><span>›</span></a></li>
          <li><a href="#/configuracion"><span>🎨 Configuración</span><span>›</span></a></li>
          {isAdmin && <li><a href="#/admin"><span>🔐 Administración</span><span>›</span></a></li>}
        </ul>
      </div>
    </>
  );
}

// La aplicación en sí: solo se muestra si la persona tiene sesión y acceso vigente
function Shell() {
  const hash = useHash();
  const { settings } = useSettings();
  const access = useAccess();
  const go = (h: string) => { window.location.hash = h; };

  // Rutas directas para Atajos de Apple: #/registrar/venta y #/registrar/gasto
  const kind = hash === '#/registrar/venta' ? 'venta' : hash === '#/registrar/gasto' ? 'gasto' : null;
  const chooser = hash === '#/registrar';
  const section = kind || chooser ? '#/' : hash;
  const active = chooser ? '#/registrar' : MORE_SECTIONS.includes(section) ? '#/mas' : section;

  // Aviso cuando faltan pocos días para que venza la suscripción
  const daysLeft = access.paidUntil && !access.isAdmin ? Math.ceil((access.paidUntil.getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand"><span className="brand-mark">{brandInitial(settings.businessName)}</span>{settings.businessName}</div>
        {TABS.map((t) => (
          <a key={t.hash} href={t.hash} className={t.hash === active ? 'on' : ''}>
            <span>{t.icon}</span>{t.label}
          </a>
        ))}
      </nav>

      <main className="main">
        {daysLeft !== null && daysLeft <= 5 && (
          <div className="banner">
            Tu suscripción {daysLeft <= 0 ? 'vence hoy' : `vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}. Comunícate con tu proveedor para renovarla.
          </div>
        )}
        {section === '#/' ? <Dashboard onNew={(k) => go(`#/registrar/${k}`)} />
          : section === '#/calendario' ? <Calendar />
          : section === '#/reportes' ? <Reports />
          : section === '#/registro' ? <History />
          : section === '#/productos' ? <Products />
          : section === '#/exportar' ? <ExportPage />
          : section === '#/configuracion' ? <SettingsPage />
          : section === '#/admin' ? <AdminPage />
          : section === '#/mas' ? <More />
          : (
            <div className="card"><h2>Página no encontrada</h2><p className="empty">Regresa a Inicio desde el menú.</p></div>
          )}
      </main>

      {chooser && (
        <div className="overlay" onClick={() => go('#/')}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <header><h2>¿Qué vas a registrar?</h2><button className="x" onClick={() => go('#/')} aria-label="Cerrar">✕</button></header>
            <div className="quick">
              <button className="big venta" onClick={() => go('#/registrar/venta')}>🛍️ Venta</button>
              <button className="big gasto" onClick={() => go('#/registrar/gasto')}>💸 Gasto</button>
            </div>
          </div>
        </div>
      )}
      {kind && <EntryModal key={kind} kind={kind} onClose={() => go('#/')} />}
    </div>
  );
}

export function App() {
  const settingsCtx = useSettingsState(); // aplica el tema y la configuración antes de pintar nada
  const access = useAccessState();        // quién puede entrar
  const syncCtx = useSyncState(access.state === 'ok' ? access.user : null); // sincroniza solo con acceso vigente

  return (
    <SettingsContext.Provider value={settingsCtx}>
      <AccessContext.Provider value={access}>
        <SyncContext.Provider value={syncCtx}>
          {access.state === 'ok' ? <Shell /> : <AuthScreens access={access} />}
        </SyncContext.Provider>
      </AccessContext.Provider>
    </SettingsContext.Provider>
  );
}
