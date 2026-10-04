import { useAccess } from '../access/AccessContext';
import { useSync } from './SyncContext';

export function SyncSection() {
  const { user, isAdmin, paidUntil, offlineGrace, logout } = useAccess();
  const { status, syncNow } = useSync();

  const statusText =
    status.state === 'syncing' ? 'Sincronizando…'
    : status.state === 'offline' ? 'Sin conexión: se sincronizará al volver el internet.'
    : status.state === 'error' ? `Error: ${status.error ?? 'no se pudo sincronizar'}`
    : status.lastSyncAt ? `✓ Al día · ${new Date(status.lastSyncAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    : '✓ Conectado';

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2>☁️ Cuenta y sincronización</h2>
      {!user ? (
        <p className="empty" style={{ marginTop: 0 }}>Modo de desarrollo sin cuenta: los datos se guardan solo en este dispositivo.</p>
      ) : (
        <>
          <p className="meta" style={{ marginTop: 0 }}>Sesión: <b>{user.email}</b>{isAdmin ? ' (administrador)' : ''}</p>
          {!isAdmin && (
            <p className="meta">
              Suscripción pagada hasta: <b>{paidUntil ? paidUntil.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</b>
            </p>
          )}
          {offlineGrace && <p className="meta">Sin conexión: usando tu última comprobación. Conéctate a internet en los próximos días para renovarla.</p>}
          <div className={`toast ${status.state === 'error' ? 'error' : ''}`}>{statusText}</div>
          <p className="empty">Ventas, gastos, productos y configuración se copian solos entre tus dispositivos. Entra con este mismo correo en el otro.</p>
          <div className="quick">
            <button className="big venta" onClick={syncNow}>🔄 Sincronizar ahora</button>
            <button className="mini" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </>
      )}
    </div>
  );
}
