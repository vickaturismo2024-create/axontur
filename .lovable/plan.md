
User wants a currency rates widget on the dashboard showing USD (oficial + blue), EUR, BRL in real-time.

Best free API for Argentine rates: dolarapi.com (no key needed, public, returns oficial/blue/MEP/CCL/tarjeta + EUR/BRL via /v1/cotizaciones).

Plan:
- New component `CurrencyRatesWidget` calling https://dolarapi.com/v1/dolares (USD variants) + https://dolarapi.com/v1/cotizaciones/eur and /brl
- Auto-refresh every 5 min via react-query
- Place on Dashboard between Hero metrics and Reminders
- No backend needed (public CORS-enabled API)
- Show compra/venta + variation arrow, last update timestamp
