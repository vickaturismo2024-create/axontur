# Manual Operativo y Guía Técnica — AxonTur

Este manual documenta las funcionalidades operativas y financieras consolidadas del sistema **AxonTur**, diseñado para agencias de viajes que requieren control estricto de expedientes, multimoneda, pasajes aéreos y cuentas corrientes.

---

## 1. Núcleo Multimoneda en Expedientes
El sistema opera bajo el principio de **separación estricta de monedas**:
- **Cero Conversiones Implícitas:** Nunca se suman importes en pesos (ARS) y dólares (USD) en un único total sin cotización explícita.
- **Visualización por Moneda:** Cada servicio (`file_services`) declara su propia moneda y costo/precio. En la cabecera del expediente, los totales se muestran desglosados (ej. `USD 1.200` y `ARS 350.000`).
- **Recibos Mixtos:** Al cobrar a un cliente mediante múltiples medios (ej. efectivo USD + transferencia ARS), el recibo guarda cada línea de pago con su moneda real, sin alterar el valor nominal.

---

## 2. Gestión de Vuelos, PNR y Zonas Horarias (UTC)
El módulo de vuelos permite ingresar tramos desde cualquier expediente mediante formato de texto GDS (Amadeus/Sabre) o PDF de aerolínea:
1. **Pestaña de Vuelos en Expediente:**
   - Permite visualizar los tramos confirmados (origen, destino, número de vuelo, horario local).
   - El sistema mapea automáticamente el código IATA del aeropuerto (ej. `EZE`, `MIA`, `MAD`) a su huso horario estándar IANA (`America/Argentina/Buenos_Aires`, `America/New_York`, etc.).
   - Calcula internamente la fecha exacta en tiempo universal (UTC) para que los recordatorios de **Check-in (24hs antes)** y las salidas aparezcan exactamente el día y hora correspondiente en el **Calendario**.
2. **Control de Cambios de Vuelo:**
   - Si una aerolínea reprograma un vuelo, el sistema detecta la modificación y muestra una alerta destacada para avisar al pasajero antes de confirmar el nuevo horario.

---

## 3. Cuentas Corrientes y Aplicación de Pagos
El circuito financiero se basa en la tabla inmutable de **Aplicaciones Financieras (`financial_allocations`)**:
- **Clientes:** Muestra el total vendido, lo cobrado, el saldo pendiente de cobro y si existen saldos a favor (créditos) para reasignar a otros viajes.
- **Proveedores / Operadores:** Permite imputar pagos a servicios específicos, llevar control de reservas de operadores y transferir saldos a favor entre expedientes sin perder trazabilidad.
- **Seguridad Bancaria:** Las cuentas bancarias de proveedores cuentan con validación y auditoría inmutable de cambios para evitar errores en transferencias.

---

## 4. Importación Segura y Trazabilidad
Al importar reservas masivas desde PDFs de mayoristas:
- El archivo PDF original queda resguardado en el Storage seguro de Supabase (`import_documents`).
- El registro de la importación (`file_imports_log`) guarda el texto crudo y las advertencias detectadas.
- Si faltan datos críticos o hay inconsistencias numéricas, el sistema solicita confirmación manual antes de crear el expediente definitivo.

---

## 5. Prevención y Monitoreo de Errores (Red de Seguridad)
- **Límites de Error (Error Boundaries):** Si una sección aislada de la pantalla sufre una falla temporal por datos corruptos o problemas de conexión, la aplicación no se apaga ni queda en blanco; muestra un panel de reintento en dicha sección y permite seguir operando en las demás pestañas.
- **Log Silencioso de Excepciones:** Cualquier fallo del frontend se reporta y almacena en la tabla `system_errors_log` de la base de datos para soporte técnico sin incomodar al usuario.

---

## 6. Comandos y Mantenimiento Técnico
- **Iniciar Servidor de Desarrollo:** `npm run dev`
- **Ejecutar Batería de Tests Automáticos:** `npm test`
- **Compilación de Producción:** `npm run build`
