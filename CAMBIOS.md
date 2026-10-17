# Cambios — app instalable (PWA)

## 1.0.0 · 17-oct-2026
- Primera versión: interfaz del proveedor como PWA (instalable, abre al instante, sesión recordada, lo último visto sin conexión).
- Validación inmediata (respuesta optimista con vuelta atrás si el servidor rechaza).
- Tarjetas: placa · turno · lugar · `Capacidad: N` · chips IDA/VUELTA; sin "Pasajeros" ni ruta con flecha.
- Resumen semanal: tarjeta por placa con cuadros IDA/VUELTA (leído/no leído, hora, tranquera); pasajeros solo el número.
- Aviso a Coordinación: botón único al encargado de guardia por hora de Lima (Config: TURNO_DIA_INICIO / TURNO_NOCHE_INICIO); el mensaje lleva todos los viajes del día.
- Requiere Apps Script actualizado (doPost + guardia). Ver LEEME.md.
