# Voucher Side Panel

Extensión de navegador para mostrar el voucher y los datos clave del depósito en un panel lateral persistente.

## Instalación

1. Abre Chrome o Edge.
2. Ve a `chrome://extensions`.
3. Activa `Modo desarrollador`.
4. Haz clic en `Cargar descomprimida`.
5. Selecciona la carpeta `browser-extension/` de este proyecto.

## Uso

1. Abre el sistema en `http://localhost:5173/`, `http://localhost:3000/` o en tu URL de EasyPanel.
2. En el modal del depósito, usa el botón `Panel Lateral`.
3. La extensión guarda el último voucher en `chrome.storage.local`.
4. Aunque cambies de página, el panel lateral sigue mostrando el último depósito cargado.
5. Si cambias el dominio del sistema, actualiza `browser-extension/manifest.json` y recarga la extensión.

## Flujo

- El frontend envía `LOAD_VOUCHER` con la URL y la metadata.
- El content script la recibe y la reenvía al service worker.
- El service worker guarda el estado y abre el side panel.
- El side panel lee el estado desde `chrome.storage.local`.

## Datos mostrados

- Fecha depósito
- Nro. operación solicitante
- Moneda
- Cliente
- Estado
- Sucursal
- Banco
