import { useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
} from 'firebase/auth';
import { brandInitial } from '../../lib/brand';
import { firebase } from '../../sync/firebase';
import { useSettings } from '../settings/SettingsContext';
import type { Access } from './AccessContext';

function authError(e: unknown) {
  switch ((e as { code?: string } | null)?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use': return 'Ese correo ya tiene cuenta: usa "Iniciar sesión".';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email': return 'El correo no es válido.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed': return 'Sin conexión a internet.';
    case 'auth/operation-not-allowed': return 'Falta activar "Correo electrónico/contraseña" en Firebase Authentication.';
    default: return e instanceof Error ? e.message : 'No se pudo completar la acción.';
  }
}

function Screen({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">{brandInitial(settings.businessName)}</span>
          <h1>{settings.businessName}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    const f = firebase();
    if (!f || !email || !password) return;
    setBusy(true); setError(''); setInfo('');
    try {
      if (mode === 'in') {
        await signInWithEmailAndPassword(f.auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(f.auth, email.trim(), password);
        await sendEmailVerification(cred.user);
      }
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    const f = firebase();
    if (!f) return;
    if (!email.trim()) { setError('Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".'); return; }
    setError(''); setInfo('');
    try {
      await sendPasswordResetEmail(f.auth, email.trim());
      setInfo('Si ese correo tiene cuenta, te enviamos un enlace para cambiar la contraseña.');
    } catch (e) {
      setError(authError(e));
    }
  }

  return (
    <Screen>
      <div className="card">
        <h2>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        <div className="field">
          <label>Correo</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
        </div>
        {error && <div className="toast error">{error}</div>}
        {info && <div className="toast">{info}</div>}
        <button className="save" disabled={busy || !email || !password} onClick={() => void submit()}>
          {mode === 'in' ? 'ENTRAR' : 'CREAR CUENTA'}
        </button>
        <div className="auth-links">
          <button className="link-btn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); setInfo(''); }}>
            {mode === 'in' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
          {mode === 'in' && <button className="link-btn" onClick={() => void resetPassword()}>Olvidé mi contraseña</button>}
        </div>
      </div>
      <p className="auth-note">Solo pueden entrar los correos autorizados. Si aún no te autorizaron, pide que agreguen tu correo antes de crear tu cuenta.</p>
    </Screen>
  );
}

function Verify({ access }: { access: Access }) {
  const [msg, setMsg] = useState('');
  const { refresh } = access;

  // Al verificar el correo desde otro lugar, la pantalla avanza sola
  useEffect(() => {
    const t = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  async function resend() {
    if (!access.user) return;
    try {
      await sendEmailVerification(access.user);
      setMsg('Te enviamos otro correo. Revisa también la carpeta de spam.');
    } catch (e) {
      setMsg(authError(e));
    }
  }

  return (
    <Screen>
      <div className="card">
        <h2>Verifica tu correo</h2>
        <p className="empty" style={{ marginTop: 0 }}>
          Enviamos un enlace a <b>{access.user?.email}</b>. Ábrelo para continuar. Si no lo ves, revisa la carpeta de spam.
        </p>
        {msg && <div className="toast">{msg}</div>}
        <div className="quick">
          <button className="save" onClick={() => void refresh()}>YA VERIFIQUÉ</button>
          <button className="mini" onClick={() => void resend()}>Reenviar correo</button>
          <button className="mini" onClick={() => void access.logout()}>Usar otro correo</button>
        </div>
      </div>
    </Screen>
  );
}

const BLOCKED: Record<NonNullable<Access['reason']>, { title: string; text: string }> = {
  'no-autorizado': { title: 'Correo no autorizado', text: 'Este correo todavía no tiene acceso. Pide a quien te dio la app que lo autorice y vuelve a intentar.' },
  suspendida: { title: 'Cuenta suspendida', text: 'Tu acceso está suspendido. Comunícate con tu proveedor para reactivarlo.' },
  vencida: { title: 'Suscripción vencida', text: 'Tu suscripción terminó. Comunícate con tu proveedor para renovarla y seguir usando la app.' },
  'sin-verificar': { title: 'No se pudo comprobar tu cuenta', text: 'Revisa tu conexión a internet y vuelve a intentar. La primera vez en cada dispositivo se necesita conexión.' },
};

function Blocked({ access }: { access: Access }) {
  const info = BLOCKED[access.reason ?? 'sin-verificar'];
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <div className="card">
        <h2>{info.title}</h2>
        <p className="empty" style={{ marginTop: 0 }}>{info.text}</p>
        {access.reason === 'vencida' && access.paidUntil && (
          <p className="meta">Venció el {access.paidUntil.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        )}
        <p className="meta">Sesión: {access.user?.email}</p>
        <p className="meta">Tus datos guardados en este dispositivo no se pierden.</p>
        <div className="quick">
          <button className="save" disabled={busy} onClick={async () => { setBusy(true); try { await access.refresh(); } finally { setBusy(false); } }}>VOLVER A COMPROBAR</button>
          <button className="mini" onClick={() => void access.logout()}>Cerrar sesión</button>
        </div>
      </div>
    </Screen>
  );
}

export function AuthScreens({ access }: { access: Access }) {
  switch (access.state) {
    case 'unconfigured':
      return (
        <Screen>
          <div className="card">
            <h2>Falta configurar Firebase</h2>
            <p className="empty" style={{ marginTop: 0 }}>
              Crea el archivo <b>.env.local</b> con los datos de tu proyecto de Firebase y tu correo de administrador (ver <b>SINCRONIZACION.md</b>) y reinicia la app.
            </p>
          </div>
        </Screen>
      );
    case 'signedOut': return <Login />;
    case 'unverified': return <Verify access={access} />;
    case 'blocked': return <Blocked access={access} />;
    default:
      return (
        <Screen>
          <p className="empty" style={{ textAlign: 'center' }}>Cargando…</p>
        </Screen>
      );
  }
}
