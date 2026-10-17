# ECOSAC · Portal de Transportes — app instalable (PWA)

Interfaz del **proveedor** como app instalable. Es solo la *pantalla*: no contiene datos, claves ni lógica de negocio.
Todo lo demás (login, validaciones, hojas, reglas) sigue en **Google Apps Script + Google Sheets**, igual que el portal actual,
que queda como respaldo.

```
Teléfono (app instalada, GitHub Pages)  ──fetch JSON──▶  Apps Script (doPost)  ──▶  Google Sheets
```

## Qué mejora respecto al portal anterior
- **Abre al instante** (la interfaz queda guardada en el teléfono) y se **instala** con icono propio.
- **Validación inmediata:** al tocar Conforme/Disconforme la tarjeta cambia al momento y el guardado ocurre por detrás.
  Si el servidor lo rechaza, la tarjeta vuelve atrás y avisa. Ya no hay velo de carga ni segunda consulta.
- **Recuerda la sesión** al reabrir la app (se cierra sola por inactividad según Config) y muestra lo último visto mientras actualiza.
- **Tarjetas compactas:** placa · turno · lugar · `Capacidad: N` · chips `IDA hh:mm` / `VUELTA hh:mm`.
- **Resumen semanal:** una tarjeta por placa con dos cuadros IDA y VUELTA (leído / no leído, hora y tranquera).
- **Aviso a Coordinación:** un solo botón al **encargado de guardia** según la hora de Lima (límites en la hoja `Config`).

## Archivos
| Archivo | Qué hace |
|---|---|
| `index.html` | Pantallas: login, inicio, Mi programación, Mis unidades, Resumen de la semana. |
| `css/estilos.css` | Todo el diseño. |
| `js/config.js` | **Único archivo que se edita:** `API_URL` (enlace `/exec` de Apps Script) y el enlace del registro manual. Es público: sin claves. |
| `js/portal.js` | Núcleo: llamadas al servidor, login/sesión, Mi programación, validación inmediata, guardia, instalar app. |
| `js/unidades.js`, `js/resumen.js`, `js/contactos.js` | Mis unidades (y QR), Resumen de la semana, Contactos de la empresa. |
| `js/qr.js` | Generador de QR (qrcode-generator, MIT). No editar. |
| `sw.js` | *Service worker*: guarda la interfaz (no los datos) para abrir rápido y sin señal. |
| `manifest.webmanifest`, `icons/` | Datos de la app instalable e iconos. |
| `.nojekyll` | Evita que GitHub Pages procese los archivos. **Debe subirse** (es un archivo oculto). |

## Puesta en marcha (en este orden)

### 0. Estado actual (17-oct-2026)
La interfaz apunta a la **copia de pruebas** ("ECOSAC Portal v3 - PWA (copia de pruebas)"), que ya tiene los 4 archivos nuevos, está implementada como app web y respondió desde otro origen (CORS verificado).
En esa copia, 135 proveedores conservan la clave que tenían en la hoja Empresas y 73 tienen clave **nueva de prueba** (hoja `EntregaClaves`, menú *Ver dónde está la hoja de entrega de claves*).
Para pasar a producción: aplicar los 4 archivos al proyecto original (sección 1), **Versión nueva**, y cambiar `API_URL` en `js/config.js` a la URL del original (está comentada en ese archivo).

### 1. Actualizar Apps Script (una sola vez)
Sin esto la app no puede hablar con el servidor.
1. Abre el proyecto de Apps Script del libro. Reemplaza el contenido de estos 4 archivos con los del zip `actualizar-apps-script`:
   `Api.gs`, `Config.gs`, `Prog.gs`, `Lecturas.gs`.
2. Guarda (Ctrl+S). En el libro: menú **ECOSAC Portal → 1. Configuración inicial** (agrega a `Config` las filas nuevas `TURNO_DIA_INICIO` 06:00 y `TURNO_NOCHE_INICIO` 18:00).
3. En `Config` completa, si falta, ENCARGADO_DIA / ENCARGADO_NOCHE (nombre y número). Quien no tenga número usa el contacto general.
4. **Implementar → Gestionar implementaciones → ✏️ → Versión: "Versión nueva" → Implementar.** El enlace `/exec` no cambia
   y el portal anterior sigue funcionando igual.

### 2. Subir la interfaz a GitHub
1. En GitHub: **New repository** → nombre, por ejemplo, `ecosac-portal` → **Public** (aquí solo hay interfaz, sin datos ni claves) → Create.
2. **Add file → Upload files** y arrastra **el contenido** de esta carpeta (index.html, sw.js, manifest.webmanifest, .nojekyll, y las carpetas css, js, icons).
   Comprueba que aparezca `.nojekyll`. → **Commit changes**.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save.**
4. En 1–2 minutos te da el enlace: `https://TU-USUARIO.github.io/ecosac-portal/`.

### 3. Probar antes de avisar a nadie
1. Abre ese enlace en el celular (Chrome) e ingresa con un proveedor de prueba.
2. Si aparece **"Sin conexión con el servidor"** estando con internet, revisa `API_URL` en `js/config.js` (debe terminar en `/exec`) y que la implementación sea *Ejecutar como: yo* y *Acceso: cualquier persona*.
3. Valida un viaje: debe cambiar al instante y quedar guardado en la hoja `Respuestas`.
4. Instalar: en Android aparece el cuadro **"Instala la app"** en el inicio; en iPhone, Safari → Compartir → **Añadir a pantalla de inicio**.

### 4. Pasar a los proveedores
Cuando un par de proveedores la hayan usado sin problemas, comparte el enlace. El portal anterior sigue disponible como respaldo.

## Cómo actualizar la app más adelante
1. Cambia los archivos en GitHub (Add file → Upload files, o el lápiz de cada archivo).
2. En `sw.js` **sube el número de `VERSION`** (por ejemplo `ecosac-pwa-1.0.1`); así los teléfonos descargan lo nuevo.
3. La primera vez que se abre después del cambio se ve lo anterior y la segunda ya lo nuevo (es normal en apps instalables).
Los cambios de reglas o datos se hacen en Apps Script (con **Versión nueva**), no aquí.

## Seguridad (qué se ve y qué no)
- El repositorio es público pero **solo contiene interfaz**. Datos, claves, reglas y el PEPPER viven en Apps Script y en las hojas.
- Cada llamada sigue exigiendo sesión; la puerta (`doPost`) solo permite las 14 funciones del proveedor. Nada de Coordinación ni de carga de datos es accesible desde aquí.
- El bloqueo a 5 intentos fallidos y la expiración de sesión siguen en el servidor.
- En el teléfono se guarda el token de sesión y lo último que vio el proveedor. **Salir** lo borra.
  Recomendar a los proveedores no usar la app en equipos compartidos sin pulsar Salir.
- El panel de Coordinación NO está en esta app: sigue en Apps Script (`…/exec?vista=interno`).

## Pruebas
`node tests/e2e/pwa.e2e.js` (en el proyecto completo `ecosac-portal-v3`): abre la app en un navegador real contra el código real del
servidor y comprueba login, tarjetas, validación inmediata, rechazo del servidor, guardia, WhatsApp, resumen semanal, sin conexión y salir (19 comprobaciones).
Lo que **no** se pudo probar fuera de Google: la llamada real desde GitHub Pages a Apps Script (CORS). Es el primer punto de la sección 3.
