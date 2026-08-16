# ReadStack — stack what you read

Save the page you are reading and its readable text into a private stack that lives only in your Chrome: read/unread marks, search, archive and a JSON export you own. Page text is captured only when you press the button — no host permissions, no background tracking.

Landing page: `https://readstack.vercel.app`

## What it does

- One click adds the current page — title, URL and readable text — to your stack (private `chrome.storage`).
- Filters: All / Unread / Archived, plus live search across titles, URLs and snippets.
- Per item: mark read/unread, archive/unarchive, open in a new tab, delete.
- Export JSON dumps the whole stack to a file you own.
- Cap of 200 items keeps storage light; the oldest *read* items are pruned first, archived items are protected.
- Brand-new: page text capture tries a plain fetch first, and only falls back to Chrome's read-the-active-tab API when the site blocks it; when neither works, the title and URL are saved so nothing is lost.

## Permissions (justified)

| Permission | Why |
| --- | --- |
| `storage` | the stack and language setting live in `chrome.storage.local` |
| `tabs` | reads the active tab's URL/title when you click the button |
| `activeTab` + `scripting` | reads page text only for the tab you clicked on (only used when a plain fetch is blocked) |

No `host_permissions`: no site ever gets persistent access.

## Install

1. Download `readstack.zip` (`https://readstack.vercel.app/readstack.zip`) and unpack it somewhere permanent.
2. Open `chrome://extensions` and enable Developer mode.
3. Click "Load unpacked" and select the folder.
4. Open the popup on the page you want to keep and click "Add this tab".

---

# ReadStack — apila lo que lees

Guarda la página que estás leyendo y su texto legible en una pila privada que vive solo en tu Chrome: marcas de leído/no leído, búsqueda, archivo y una exportación JSON que te pertenece. El texto de la página solo se captura cuando pulsas el botón — sin permisos de host, sin seguimiento en segundo plano.

Página de aterrizaje: `https://readstack.vercel.app`

## Qué hace

- Un clic añade la página actual — título, URL y texto legible — a tu pila (`chrome.storage` privado).
- Filtros: Todo / No leído / Archivado, más búsqueda en vivo por títulos, URLs y fragmentos.
- Por elemento: marcar leído/no leído, archivar/desarchivar, abrir en pestaña nueva, eliminar.
- Exportar JSON vuelca toda la pila a un archivo tuyo.
- Límite de 200 elementos mantiene el almacenamiento liviano; se podan primero los *leídos* más antiguos y los archivados están protegidos.
- La captura del texto intenta primero un `fetch` simple y solo cae a la API de lectura de la pestaña activa de Chrome cuando el sitio lo bloquea; si nada funciona, se guardan el título y la URL para no perder nada.

## Permisos (justificados)

| Permiso | Por qué |
| --- | --- |
| `storage` | la pila y el idioma viven en `chrome.storage.local` |
| `tabs` | lee la URL/título de la pestaña activa al pulsar el botón |
| `activeTab` + `scripting` | lee el texto solo de la pestaña en la que hiciste clic (solo si un `fetch` simple es bloqueado) |

Sin `host_permissions`: ningún sitio obtiene jamás acceso persistente.

## Instalación

1. Descarga `readstack.zip` (`https://readstack.vercel.app/readstack.zip`) y descomprímelo en un lugar permanente.
2. Abre `chrome://extensions` y activa el modo desarrollador.
3. Haz clic en "Cargar descomprimida" y elige la carpeta.
4. Abre el popup en la página que quieras conservar y pulsa "Añadir esta pestaña".

## Credit / Créditos

Built by [Harley Vásquez](https://www.linkedin.com/in/harleyvasquez/) — Creado por Harley Vásquez.