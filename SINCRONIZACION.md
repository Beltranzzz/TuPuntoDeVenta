# Firebase, acceso de clientes y sincronización

Esta app exige **iniciar sesión**. Solo pueden usarla los correos que tú autorices desde el panel de administración,
y cada uno con una fecha de "pagado hasta". Lo que registren se sincroniza entre sus dispositivos.

## 1. Crear el proyecto en Firebase (uno nuevo, solo para esta app)
1. https://console.firebase.google.com → **Agregar proyecto** (sin Analytics).
2. **Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
3. (Recomendado) En Authentication → **Plantillas**, cambia el idioma del correo de verificación a **Español**.
4. **Compilación → Firestore Database → Crear base de datos** → modo **producción** → ubicación cercana.

## 2. Publicar las reglas de seguridad (esto es lo que realmente protege el acceso)
1. Abre `firestore.rules` y cambia `tu_correo_admin@ejemplo.com` por **tu correo** (el de administrador).
2. En Firestore → pestaña **Reglas**: borra todo, pega el contenido del archivo y **Publicar**.

## 3. Conectar la app
1. **Configuración del proyecto (engrane) → Tus apps → Web (</>)** → registra la app → copia `apiKey`, `authDomain`, `projectId` y `appId`.
2. Copia `.env.example` como `.env.local` y llena los 4 valores y `VITE_ADMIN_EMAIL` (tu mismo correo de administrador).
3. `npm install` y `npm run dev` (si ya estaba corriendo, reinícialo).

## 4. Entrar como administrador
1. En la app toca **Crear cuenta** con tu correo de administrador y una contraseña.
2. Abre el correo de verificación (revisa spam) y toca el enlace. La app avanza sola.
3. Ve a **Más → Administración**.

## 5. Autorizar clientes
1. En Administración escribe el correo del cliente, la fecha "pagado hasta" y toca **Autorizar correo**.
2. Avísale al cliente: debe abrir la app, tocar **Crear cuenta** con **ese mismo correo**, verificarlo y listo.
3. Cuando te paguen la mensualidad: botón **+30 días** (suma 30 días a la fecha de vencimiento).
4. **Suspender** corta el acceso al momento si el cliente tiene internet; **Quitar** lo saca de la lista.

## 6. Publicar en Vercel
Agrega en Vercel (Settings → Environment Variables) las 5 variables `VITE_FIREBASE_...` y `VITE_ADMIN_EMAIL`, y vuelve a desplegar.
Si el despliegue falla con `Permission denied`, usa como Build Command:
`node node_modules/typescript/bin/tsc && node node_modules/vite/bin/vite.js build`

## Cómo funciona la seguridad
- Cualquiera puede crear una cuenta de Firebase, pero **sin estar en tu lista no puede leer ni guardar datos** (lo bloquean las reglas, no solo la pantalla).
- El correo debe estar **verificado**: nadie puede registrarse con el correo de otra persona.
- Si un cliente pierde la suscripción, la app se bloquea al conectarse. Sin internet puede seguir usándola hasta 7 días desde su última comprobación.
- Sus datos viven en `users/<id>/…` y solo ese usuario puede leerlos; tú, como administrador, ves la lista de clientes pero no sus ventas.
- Al entrar una cuenta distinta en un dispositivo, se borran los datos locales de la anterior (así no se mezclan).

## Probar el diseño sin Firebase
En `.env.local` agrega `VITE_DISABLE_AUTH=true` y corre `npm run dev`: entra directo, sin sesión. Solo funciona en desarrollo, nunca en la versión publicada.

## Costos
El plan gratuito de Firebase sirve para probar, pero sus límites son **por proyecto** (no por cliente). Con varios negocios hará falta el plan de pago por uso (Blaze);
ponle una alerta de presupuesto. Cada operación de datos hace además una lectura de verificación de la suscripción.
