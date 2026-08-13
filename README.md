# Catálogo de stock — guía de despliegue

Esto es lo que hace la app:

- **`tudominio.com/`** → catálogo público. Sin login. El QR apunta aquí.
  Navegación: Uniformes clínicos / Chaquetas → Hombre / Mujer → listado → detalle.
- **`tudominio.com/admin.html`** → solo tú. Pide usuario y contraseña. Desde ahí subes,
  editas y eliminas prendas (con foto incluida).

Seguridad que ya viene incluida en el código:
- Contraseña guardada como **hash bcrypt** (nunca en texto plano).
- Sesión de administrador con **JWT en cookie `httpOnly` + `secure` + `sameSite=strict`**
  (no se puede leer ni robar fácilmente desde el navegador).
- **Límite de intentos de login** (8 cada 15 minutos por IP) para frenar ataques de fuerza bruta.
- Rutas de escritura (subir/editar/eliminar) protegidas por middleware — sin sesión válida, no responden.
- No existe registro de usuarios ni tabla de clientes: el único admin sale de variables de entorno.

---

## 1. Base de datos — MongoDB Atlas (gratis)

1. Crea una cuenta en https://www.mongodb.com/cloud/atlas/register
2. Crea un **proyecto** y dentro un **cluster gratuito (M0)**.
3. En "Database Access", crea un usuario de base de datos con una contraseña (guárdala).
4. En "Network Access", agrega `0.0.0.0/0` (permitir desde cualquier IP) — es lo normal
   para apps en hosting como Render.
5. Click en "Connect" → "Drivers" → copia el connection string. Se ve así:
   ```
   mongodb+srv://usuario:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Reemplaza `<password>` por la real y agrega el nombre de la base al final, por ejemplo
   `.../catalogo_ropa?retryWrites=true...`. Ese valor completo va en `MONGODB_URI`.

## 2. Imágenes — Cloudinary (gratis)

1. Crea una cuenta en https://cloudinary.com/users/register/free
2. En el Dashboard verás directamente **Cloud name**, **API Key** y **API Secret**.
3. Cópialos, los usarás en las variables de entorno.

## 3. Generar la contraseña del administrador

No pongas tu contraseña real en ningún archivo. En tu computador, con Node.js instalado:

```bash
cd catalogo-app
npm install
npm run hash-password "tuClaveSuperSegura123"
```

Esto imprime un hash largo (empieza con `$2a$...`). Ese hash es lo que va en
`ADMIN_PASSWORD_HASH`, no tu contraseña original.

## 4. Subir el proyecto a GitHub

```bash
cd catalogo-app
git init
git add .
git commit -m "catálogo inicial"
```

Crea un repositorio nuevo (vacío) en https://github.com/new y sigue las instrucciones
que GitHub te muestra para subir tu código (`git remote add origin ...` y `git push`).

## 5. Desplegar en Render (gratis)

1. Crea una cuenta en https://render.com (puedes entrar con tu cuenta de GitHub).
2. "New" → "Web Service" → conecta tu repositorio.
3. Configuración:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. En "Environment", agrega estas variables (con tus valores reales):
   - `MONGODB_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `JWT_SECRET` → cualquier texto largo y aleatorio (ej. genera uno en
     https://randomkeygen.com y pégalo)
   - `ADMIN_USERNAME` → el usuario con el que vas a entrar
   - `ADMIN_PASSWORD_HASH` → el hash que generaste en el paso 3
5. Click en "Create Web Service". Render instala, construye y despliega. En unos minutos
   te da una URL fija tipo `https://tu-catalogo.onrender.com` — **esa es la URL que va en tu QR**.

Nota sobre el plan gratuito de Render: si nadie visita la página por un rato, el servidor
"duerme" y la primera visita después de eso tarda unos 20-30 segundos en despertar. El
resto de las visitas van normales. Si eso te molesta para el uso en el negocio, el plan
pago de Render (desde ~7 USD/mes) elimina ese comportamiento.

## 6. Primer uso

1. Entra a `https://tu-catalogo.onrender.com/admin.html`
2. Inicia sesión con tu `ADMIN_USERNAME` y la contraseña real (la de texto plano que
   usaste para generar el hash, no el hash).
3. Sube tus primeras prendas.
4. Entra a `https://tu-catalogo.onrender.com/` para generar el QR (botón "Ver QR") e
   imprimirlo o mostrarlo en el negocio.

## Ejecutar en tu computador antes de desplegar (opcional, para probar)

```bash
cd catalogo-app
cp .env.example .env
# edita .env con tus valores reales
npm install
npm start
```

Luego abre `http://localhost:3000` en el navegador.
