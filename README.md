# BILLAR JADE — Control de Mesas (Versión Avanzada)

**Características añadidas** (sin backend, persistencia local):
- 🎨 Branding: color principal configurable y logo placeholder (`logo-placeholder.svg`).
- 💵 Cobro con **efectivo recibido** y cálculo **de cambio**.
- 🧾 **Historial de tickets del día** (localStorage) + **Exportar CSV**.
- 📊 **Reporte diario** (totales por sucursal y top mesas).
- 🔐 **PIN Admin** configurable.
- 💼 **Cierre de caja** (guarda resumen y limpia historial del día).
- 🖨️ Ticket 80mm listo para imprimir (o guardar como PDF desde el diálogo de impresión).

## Cómo usar
1. Abrir `index.html` en el navegador.
2. Elegir sucursal y rol (PIN por defecto: `2468`).
3. Iniciar/Pausar/Reanudar mesa, luego **Detener y Cobrar**.
4. En el cobro, ingresa **efectivo recibido** → mostrará **cambio**.
5. Ver **Historial** y **Reporte** desde la barra superior. **Exportar CSV** disponible.
6. **Cierre de caja** limpia el historial del día y guarda un resumen en `localStorage` (`cierres_billar_jade`).

## Deploy (Netlify / Vercel)
Sitio estático: no requiere build. Publicar archivos en la raíz.
Deploy automático funcionando — Julio.
