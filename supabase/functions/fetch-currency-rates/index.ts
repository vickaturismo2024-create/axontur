// Edge function pública: scrapea cotizaciones desde 0223.com.ar/dolar
// Cache en memoria 5 min para no martillar al sitio.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SOURCE_URL = 'https://www.0223.com.ar/dolar';
const CACHE_TTL_MS = 5 * 60 * 1000;

// Mapeo nombre exacto en el HTML -> { key, label }
const RATE_MAP: Record<string, { key: string; label: string }> = {
  'Dólar': { key: 'usd_oficial', label: 'USD Oficial' },
  'Dolar': { key: 'usd_oficial', label: 'USD Oficial' },
  'Dólar Blue': { key: 'usd_blue', label: 'USD Blue' },
  'Dolar Blue': { key: 'usd_blue', label: 'USD Blue' },
  'Euro': { key: 'eur_oficial', label: 'EUR Oficial' },
  'Euro Blue': { key: 'eur_blue', label: 'EUR Blue' },
  'BRL': { key: 'brl', label: 'BRL' },
  'CLP': { key: 'clp', label: 'CLP' },
  'Bitcoin': { key: 'btc_usd', label: 'Bitcoin' },
};

// Orden de salida deseado
const OUTPUT_ORDER = ['usd_oficial', 'usd_blue', 'eur_oficial', 'eur_blue', 'brl', 'clp', 'btc_usd'];

interface Rate {
  key: string;
  label: string;
  compra: number | null;
  venta: number | null;
  currency?: string;
}

interface CachedPayload {
  updatedAt: string;
  source: string;
  rates: Rate[];
}

let cache: { data: CachedPayload; expiresAt: number } | null = null;

// "$1.345,00" -> 1345.00 ; "$1,5592" -> 1.5592
function parseArsNumber(raw: string): number | null {
  const cleaned = raw.replace(/\$|\s|USD|\.\-|\-/g, '').trim();
  if (!cleaned) return null;
  // Si tiene punto y coma, el punto es separador de miles y la coma es decimal.
  // Si solo tiene coma, la coma es decimal.
  let normalized: string;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  } else {
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

// Bitcoin: "USD 75379.-" -> 75379
function parseBitcoinNumber(raw: string): number | null {
  const m = raw.match(/USD\s*([\d.,]+)/i);
  if (!m) return null;
  return parseArsNumber(m[1]);
}

function parseHtml(html: string): Rate[] {
  const rates: Rate[] = [];

  // Capturar cada <li> dentro de container_cotizaciones
  // Acotamos al bloque de cotizaciones para no levantar otros <li> de la página
  const containerMatch = html.match(/container_cotizaciones[\s\S]*?<\/ul>/i);
  const scope = containerMatch ? containerMatch[0] : html;

  const liRegex = /<li>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRegex.exec(scope)) !== null) {
    const liHtml = liMatch[1];

    // Nombre de moneda: <div class="moneda"><p>NOMBRE</p>
    const monedaMatch = liHtml.match(/class=["']moneda["'][^>]*>\s*<p[^>]*>([^<]+)<\/p>/i);
    if (!monedaMatch) continue;
    const monedaName = monedaMatch[1].trim();
    const meta = RATE_MAP[monedaName];
    if (!meta) continue;

    if (meta.key === 'btc_usd') {
      // Bitcoin: solo un <p class="valor">USD XXXX.-</p>
      const btcMatch = liHtml.match(/class=["']valor["'][^>]*>\s*([^<]+)<\/p>/i);
      const venta = btcMatch ? parseBitcoinNumber(btcMatch[1]) : null;
      rates.push({ ...meta, compra: null, venta, currency: 'USD' });
      continue;
    }

    // Resto: dos <p class="valor">$XXX</p> en orden compra, venta
    const valorRegex = /class=["']valor["'][^>]*>\s*([^<]+)<\/p>/gi;
    const valores: string[] = [];
    let vm: RegExpExecArray | null;
    while ((vm = valorRegex.exec(liHtml)) !== null) {
      valores.push(vm[1]);
    }
    if (valores.length < 2) continue;

    rates.push({
      ...meta,
      compra: parseArsNumber(valores[0]),
      venta: parseArsNumber(valores[1]),
    });
  }

  // Ordenar según OUTPUT_ORDER
  rates.sort((a, b) => OUTPUT_ORDER.indexOf(a.key) - OUTPUT_ORDER.indexOf(b.key));
  return rates;
}

async function fetchRates(): Promise<CachedPayload> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const res = await fetch(SOURCE_URL, {
    headers: {
      // Algunos sitios bloquean user-agents por defecto de Deno/curl
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`Fuente respondió ${res.status}`);
  }

  const html = await res.text();
  const rates = parseHtml(html);

  if (rates.length === 0) {
    throw new Error('No se pudieron extraer cotizaciones (cambió el HTML de la fuente)');
  }

  const payload: CachedPayload = {
    updatedAt: new Date().toISOString(),
    source: '0223.com.ar',
    rates,
  };

  cache = { data: payload, expiresAt: now + CACHE_TTL_MS };
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await fetchRates();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fetch-currency-rates error:', err);
    return new Response(
      JSON.stringify({
        error: 'No se pudieron obtener las cotizaciones',
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
