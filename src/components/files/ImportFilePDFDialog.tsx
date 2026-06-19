import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Users,
  Receipt,
  Wallet,
  Calendar,
  FileText,
  Loader2,
  Check,
  Plane,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { extractTextWithPositionsFromPDF, type PdfTextItem } from '@/lib/pdfTextExtractor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LegacyPassenger {
  name: string;
  type: string;
  dni: string | null;
  birthDate: string | null;
}

interface LegacyService {
  supplierName: string;
  description: string;
  serviceType: string;
  startDate: string | null;
  endDate: string | null;
  cost: number;
  price: number;
  currency: 'USD' | 'ARS';
  origin?: string | null;
  destination?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  regime?: string | null;
  roomType?: string | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  company?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  luggage?: string | null;
  luggageType?: string | null;
  hotelCategory?: string | null;
  shipName?: string | null;
  embarkationPort?: string | null;
  disembarkationPort?: string | null;
  deck?: string | null;
  cabinNumber?: string | null;
  coverage?: string | null;
  insurancePlan?: string | null;
}

interface LegacyReceipt {
  concept: string;
  date: string | null;
  amount: number;
  currency: 'USD' | 'ARS';
}

interface LegacyPayment {
  supplierName: string;
  date: string | null;
  amount: number;
  currency: 'USD' | 'ARS';
}

interface LegacyReservation {
  legacyId: string;
  agent: string;
  clientLegacyId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  startDate: string | null;
  endDate: string | null;
  numPax: number;
  currency: 'USD' | 'ARS';
  passengers: LegacyPassenger[];
  services: LegacyService[];
  receipts: LegacyReceipt[];
  payments: LegacyPayment[];
}

const LEGACY_NOTE_PREFIX = 'Importado del sistema antiguo';

// Local Fallback Parser using Regex
// Local Fallback Parser using Regex
function parseLegacyReservationPDFText(rawText: string, pdfItems?: PdfTextItem[]): LegacyReservation {
  console.log('[Local Parser] Running regex fallback parser...', pdfItems ? `(with ${pdfItems.length} positioned items)` : '(no positions)');
  // Preserve line structure for section splitting - only normalize CRLF
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const flatText = text.replace(/\n+/g, ' '); // flattened version for single-line patterns

  // Detect main currency
  const currencyMatch = flatText.match(/(?:u\$s|usd|d[Ã³o]lar)/i);
  const detectedCurrency: 'USD' | 'ARS' = currencyMatch ? 'USD' : 'ARS';

  const parseDateStr = (dStr: string | null) => {
    if (!dStr) return null;
    const parts = dStr.split('/');
    if (parts.length !== 3) return null;
    const yy = parseInt(parts[2]);
    const year = yy < 100 ? (yy < 30 ? 2000 + yy : 1900 + yy) : yy;
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  };

  // 1. Reserva NÂ°
  let legacyId = 'S/N';
  const legacyIdMatch = flatText.match(/Reserva\s+N[Â°Âºo\.\s]*(\d+)/i) || 
                        flatText.match(/(\d+)\s+Tel\.\s+Emision/i) || 
                        flatText.match(/^\s*(\d{3,})/);
  if (legacyIdMatch) {
    legacyId = legacyIdMatch[1];
  }

  // 2. Client Header - try multiple patterns
  let clientName = 'Cliente HistÃ³rico';
  let clientPhone = '';
  let clientLegacyId = '';
  let clientAddress = '';
  const clientMatch = flatText.match(/([A-Z\s\-]+?)\s+(\d{7,12})\s+(\d+)\s+(\d+\s+[A-Z\s\-]+?)\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i);
  if (clientMatch) {
    clientName = clientMatch[1].trim();
    clientPhone = clientMatch[2].trim();
    clientLegacyId = clientMatch[3].trim();
    clientAddress = clientMatch[4].trim();
  } else {
    // Fallback: Cliente NÂ° XXXX followed by name
    const clientMatch2 = flatText.match(/Cliente\s+N[Â°Âºo\.\s]*(\d+)\s+([A-Z][A-Z\s\-]{3,40})/i);
    if (clientMatch2) {
      clientLegacyId = clientMatch2[1].trim();
      clientName = clientMatch2[2].trim();
    }
  }

  // 3. Dates
  const travelDatesMatch = flatText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:Solicitud|Salida)/i);
  const startDate = travelDatesMatch ? parseDateStr(travelDatesMatch[2]) : null;

  // 4. Vendedor
  const sellerMatch = flatText.match(/([A-Z\s]+?)\s+Cliente\s+N[Â°Âºo\.\s]*/i);
  const agent = sellerMatch ? sellerMatch[1].replace(/Solicitud\s+Salida|Salida\s+Solicitud/gi, '').trim() : '';

  // 5. Passengers (PAX)
  const passengers: LegacyPassenger[] = [];
  const paxSectionMatch = text.match(/PAX\s+([\s\S]+?)(?=SERVICIOS|$)/);
  if (paxSectionMatch) {
    const paxSection = paxSectionMatch[1];
    const paxLines = paxSection.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (const line of paxLines) {
      if (line.includes('SERVICIOS')) break;
      
      const typeMatch = line.match(/\b(ADULTO|MENOR|INFANTE)\b/i);
      if (!typeMatch) continue; // Not a passenger line

      const type = typeMatch[1].toUpperCase();
      let name = line.substring(0, typeMatch.index).trim().replace(/^-\s*/, '');
      if (name.toUpperCase().startsWith('PAX ')) name = name.substring(4).trim();
      
      // Look for document (DNI, CI, PASAPORTE, or just a 7-9 digit number)
      let dni = null;
      const docMatch = line.match(/\b(DNI|CI|PASAPORTE|PAS)\s*[\-\:]?\s*([A-Z0-9\.]+)\b/i);
      if (docMatch) {
        dni = docMatch[2].replace(/\./g, '');
      } else {
        const numMatch = line.substring(typeMatch.index).match(/\b(\d{7,9})\b/);
        if (numMatch) dni = numMatch[1];
      }

      // Look for birthdate (DD/MM/YY or DD/MM/YYYY)
      let birthDate = null;
      const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
      if (dateMatch) {
        birthDate = parseDateStr(dateMatch[1]);
      }

      passengers.push({ name, type, dni, birthDate });
    }
  }

  // If clientName is not set, use first passenger
  if (clientName === 'Cliente HistÃ³rico' && passengers.length > 0) {
    clientName = passengers[0].name;
  }

  // ============================================================
  // FINANCIAL SECTIONS: Position-based parser using pdfItems
  // ============================================================

  // Helper to parse a number string handling AR/US decimal formats
  const parseAmount = (n: string): number => {
    const s = n.trim();
    if (/^(\d{1,3}(,\d{3})*|\d+)\.\d{2}$/.test(s)) return parseFloat(s.replace(/,/g, ''));
    if (/^(\d{1,3}(\.\d{3})*|\d+),\d{2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(/,/g, '.'));
    if (s.includes('.') && !s.includes(',')) return parseFloat(s);
    if (s.includes(',') && !s.includes('.')) return parseFloat(s.replace(/,/g, '.'));
    return parseFloat(s.replace(/\./g, '').replace(/,/g, '.'));
  };

  // Detect service type from text
  const detectServiceType = (t: string): string => {
    const d = t.toLowerCase();
    if (d.includes('aereo') || d.includes('vuelo') || d.includes('airline')) return 'flight';
    if (d.includes('hotel') || d.includes('alojamiento') || d.includes('terrestre') || d.includes('hospedaje')) return 'lodging';
    if (d.includes('traslado') || d.includes('transfer') || d.includes('shuttle')) return 'transfer';
    if (d.includes('seguro') || d.includes('asistencia') || d.includes('assist')) return 'insurance';
    if (d.includes('crucero') || d.includes('naviera') || d.includes('cruise') || d.includes('msc')) return 'cruise';
    if (d.includes('tren') || d.includes('train') || d.includes('renfe')) return 'train';
    if (d.includes('ferry') || d.includes('barco') || d.includes('buquebus')) return 'ferry';
    if (d.includes('auto') || d.includes('car') || d.includes('rent') || d.includes('hertz') || d.includes('avis')) return 'rental_car';
    return 'other';
  };

  const services: LegacyService[] = [];
  const receipts: LegacyReceipt[] = [];
  const payments: LegacyPayment[] = [];

  if (pdfItems && pdfItems.length > 0) {
    // --- Step 1: Group pdfItems into lines by Y coordinate ---
    const Y_TOL = 2;
    const lineMap = new Map<number, PdfTextItem[]>();
    for (const item of pdfItems) {
      let foundY: number | null = null;
      for (const y of lineMap.keys()) {
        if (Math.abs(y - item.y) < Y_TOL) { foundY = y; break; }
      }
      if (foundY !== null) {
        lineMap.get(foundY)!.push(item);
      } else {
        lineMap.set(item.y, [item]);
      }
    }
    const pdfLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.x - b.x) }));

    // --- Step 2: Find column boundary (Pesos vs Dolares) ---
    const pesosItem = pdfItems.find(it => /^Pesos$/i.test(it.text.trim()));
    const dolaresItem = pdfItems.find(it => /^Dolares$/i.test(it.text.trim()));
    const hasDualCols = !!(pesosItem && dolaresItem);
    const colBoundX = hasDualCols ? (pesosItem!.x + dolaresItem!.x) / 2 : 0;
    console.log(`[PDF Parser] Dual columns: ${hasDualCols}, boundary X: ${colBoundX}`);

    // --- Step 3: Find section Y boundaries ---
    // Section headers are ALL-CAPS and at the left margin (x < 50).
    // This prevents matching table column headers like "Pagos" (x=321) or "Cobros" (x=316).
    const serviciosY = pdfItems.find(it => it.text.trim() === 'SERVICIOS' && it.x < 50)?.y ?? null;
    const cobrosY = pdfItems.find(it => it.text.trim() === 'COBROS' && it.x < 50)?.y ?? null;
    const pagosY = pdfItems.find(it => it.text.trim() === 'PAGOS' && it.x < 50)?.y ?? null;
    const totalServY = pdfItems.find(it => /^TOTAL\s+SERVICIOS$/i.test(it.text.trim()))?.y ?? null;
    const totalCobrosY = pdfItems.find(it => /^TOTAL\s+COBROS$/i.test(it.text.trim()))?.y ?? null;
    const totalPagosY = pdfItems.find(it => /^TOTAL\s+PAGOS$/i.test(it.text.trim()))?.y ?? null;

    // Helper: get currency for a line based on X position of its numeric items
    const getCurrencyForLine = (lineItems: PdfTextItem[]): 'USD' | 'ARS' => {
      if (!hasDualCols) return detectedCurrency;
      const nums = lineItems.filter(it => /^\d[\d\.\,]*\d$/.test(it.text.trim()) || /^\d+\.\d{2}$/.test(it.text.trim()));
      const inPesos = nums.filter(it => it.x < colBoundX);
      const inDolares = nums.filter(it => it.x >= colBoundX);
      if (inPesos.length > 0 && inDolares.length === 0) return 'ARS';
      if (inDolares.length > 0 && inPesos.length === 0) return 'USD';
      if (inPesos.length > 0 && inDolares.length > 0) {
        const pMax = Math.max(...inPesos.map(it => parseAmount(it.text)));
        const dMax = Math.max(...inDolares.map(it => parseAmount(it.text)));
        return pMax > dMax ? 'ARS' : 'USD';
      }
      return detectedCurrency;
    };

    // Helper: get amounts from correct column
    const getColumnAmounts = (lineItems: PdfTextItem[], cur: 'USD' | 'ARS'): number[] => {
      const nums = lineItems.filter(it => /^\d[\d\.\,]*\d$/.test(it.text.trim()) || /^\d+\.\d{2}$/.test(it.text.trim()));
      if (!hasDualCols) return nums.map(it => parseAmount(it.text)).filter(n => Number.isFinite(n) && n > 0);
      return nums
        .filter(it => cur === 'ARS' ? it.x < colBoundX : it.x >= colBoundX)
        .map(it => parseAmount(it.text))
        .filter(n => Number.isFinite(n) && n > 0);
    };

    // --- Step 4: Parse SERVICIOS ---
    if (serviciosY !== null) {
      const svcEndY = totalServY ?? cobrosY ?? pagosY ?? -Infinity;
      const svcLines = pdfLines.filter(l => l.y < serviciosY && l.y > svcEndY);
      const headerLineY = pdfItems.find(it => it.text.trim() === 'Costo' && it.y < serviciosY && it.y > svcEndY)?.y;

      for (const line of svcLines) {
        if (headerLineY && Math.abs(line.y - headerLineY) < Y_TOL) continue;
        const firstItem = line.items[0];
        if (!firstItem || /^\d/.test(firstItem.text.trim())) continue;
        if (/^TOTAL/i.test(firstItem.text.trim())) continue;

        const dateItems = line.items.filter(it => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(it.text.trim()));
        if (dateItems.length === 0) continue;

        const date1 = parseDateStr(dateItems[0].text.trim());
        const date2 = dateItems.length >= 2 ? parseDateStr(dateItems[1].text.trim()) : null;
        const firstDateX = dateItems[0].x;
        const textBeforeDate = line.items
          .filter(it => it.x < firstDateX && !/^\d{1,2}\//.test(it.text.trim()))
          .map(it => it.text.trim()).join(' ');

        let sName = textBeforeDate;
        let desc = '';
        const ci = textBeforeDate.indexOf(':');
        if (ci > 0) { sName = textBeforeDate.substring(0, ci).trim(); desc = textBeforeDate.substring(ci + 1).trim(); }
        sName = sName.replace(/^(?:SERVICIOS|Costo|Iva|Importe|Dif|Pesos|Dolares|\s)+/gi, '').trim();
        if (!sName) continue;

        const currency = getCurrencyForLine(line.items);
        const amounts = getColumnAmounts(line.items, currency);
        let cost = 0, price = 0;
        if (amounts.length > 0) {
          cost = amounts[0];
          price = amounts.length >= 2 ? amounts[1] : cost;
          if (amounts.length >= 3) price = Math.max(...amounts);
        }

        services.push({
          supplierName: sName, description: desc,
          serviceType: detectServiceType(sName + ' ' + desc),
          startDate: date1, endDate: date2, cost, price, currency,
        });
        console.log(`[SVC] ${sName}: ${currency} cost=${cost} price=${price}`);
      }
    }

    // --- Step 5: Parse COBROS ---
    if (cobrosY !== null) {
      const cobEndY = totalCobrosY ?? pagosY ?? -Infinity;
      const cobLines = pdfLines.filter(l => l.y < cobrosY && l.y > cobEndY);
      let curCobro: { parts: string[]; date: string | null; amount: number; currency: 'USD' | 'ARS' } | null = null;

      for (const line of cobLines) {
        const lt = line.items.map(it => it.text).join(' ').trim();
        if (!lt || /^TOTAL/i.test(lt)) continue;
        const isNew = /^ER\s+\d/i.test(lt);

        if (isNew) {
          if (curCobro && curCobro.amount > 0) {
            receipts.push({ concept: curCobro.parts.join(' ').replace(/\s+/g, ' ').trim(), date: curCobro.date, amount: curCobro.amount, currency: curCobro.currency });
          }
          const dateItem = line.items.find(it => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(it.text.trim()));
          const currency = getCurrencyForLine(line.items);
          const amounts = getColumnAmounts(line.items, currency);
          const amount = amounts.length > 0 ? Math.max(...amounts) : 0;
          const conceptText = line.items
            .filter(it => it !== dateItem && !/^\d[\d\.\,]*\d$/.test(it.text.trim()))
            .map(it => it.text.trim()).join(' ');
          curCobro = { parts: [conceptText], date: dateItem ? parseDateStr(dateItem.text.trim()) : null, amount, currency };
        } else if (curCobro) {
          const txt = line.items.filter(it => !/^\d[\d\.\,]*\d$/.test(it.text.trim())).map(it => it.text.trim()).join(' ');
          if (txt) curCobro.parts.push(txt);
        }
      }
      if (curCobro && curCobro.amount > 0) {
        receipts.push({ concept: curCobro.parts.join(' ').replace(/\s+/g, ' ').trim(), date: curCobro.date, amount: curCobro.amount, currency: curCobro.currency });
      }
    }

    // --- Step 6: Parse PAGOS ---
    if (pagosY !== null) {
      const pagEndY = totalPagosY ?? -Infinity;
      const pagLines = pdfLines.filter(l => l.y < pagosY && l.y > pagEndY);

      for (const line of pagLines) {
        const lt = line.items.map(it => it.text).join(' ').trim();
        if (!lt || /^TOTAL/i.test(lt) || /Saldo/i.test(lt) || /Reserva\s+N/i.test(lt)) continue;
        const dateItem = line.items.find(it => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(it.text.trim()));
        if (!dateItem) continue;
        const sName = line.items.filter(it => it.x < dateItem.x && !/^\d/.test(it.text.trim())).map(it => it.text.trim()).join(' ');
        if (!sName) continue;
        const currency = getCurrencyForLine(line.items);
        const amounts = getColumnAmounts(line.items, currency);
        const amount = amounts.length > 0 ? Math.max(...amounts) : 0;
        if (amount > 0) {
          payments.push({ supplierName: sName, date: parseDateStr(dateItem.text.trim()), amount, currency });
          console.log(`[PAG] ${sName}: ${currency} ${amount}`);
        }
      }
    }
  } else {
    // Fallback: text-only parser (no position data)
    console.warn('[PDF Parser] No position data, text-only fallback');
  }

  return {
    legacyId,
    agent,
    clientLegacyId,
    clientName,
    clientPhone,
    clientAddress,
    startDate,
    endDate: services.length > 0 ? services[services.length - 1].endDate : null,
    numPax: passengers.length || 1,
    currency: detectedCurrency,
    passengers,
    services,
    receipts,
    payments
  };
}



export function ImportFilePDFDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reservation, setReservation] = useState<LegacyReservation | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [progress, setProgress] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [matchedClientId, setMatchedClientId] = useState<string | null>(null);

  const reset = () => {
    setReservation(null);
    setPdfFile(null);
    setProgress('');
    setIsDuplicate(false);
    setMatchedClientId(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El PDF no puede superar los 10MB');
      return;
    }
    setPdfFile(file);
    setParsing(true);
    setProgress('Extrayendo texto del PDF...');

    try {
      const { text, items: pdfItems } = await extractTextWithPositionsFromPDF(file, setProgress);
      if (!text || text.length < 50) {
        throw new Error('No se pudo extraer suficiente texto del PDF.');
      }

      setProgress('Analizando con IA...');
      let parsedData: LegacyReservation | null = null;

      try {
        const { data, error } = await supabase.functions.invoke('parse-pdf', {
          body: { text, isLegacy: true },
        });
        if (!error && data && data.legacyId) {
          parsedData = {
            legacyId: data.legacyId,
            agent: data.agent || '',
            clientLegacyId: data.clientLegacyId || '',
            clientName: data.clientName || data.passengers?.[0]?.name || 'Cliente HistÃ³rico',
            clientPhone: data.clientPhone || '',
            clientAddress: data.clientAddress || '',
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            numPax: data.numPax || data.passengers?.length || 1,
            currency: data.currency || 'USD',
            passengers: (data.passengers || []).map((p: any) => ({
              name: p.name,
              type: p.type || 'ADULTO',
              dni: p.documentNumber || p.dni || null,
              birthDate: p.birthDate || null,
            })),
            services: (data.services || []).map((s: any) => {
              // Determine per-service currency
              const svcCurrency = s.currency || data.currency || 'USD';
              // If AI provided split columns (costArs/costUsd), use the correct one
              let cost = s.cost || 0;
              let price = s.price || 0;
              if (svcCurrency === 'USD' && s.costUsd && s.costUsd > 0) {
                cost = s.costUsd;
                price = s.priceUsd || s.costUsd;
              } else if (svcCurrency === 'ARS' && s.costArs && s.costArs > 0) {
                cost = s.costArs;
                price = s.priceArs || s.costArs;
              }
              return {
                ...s,
                currency: svcCurrency,
                cost,
                price,
              };
            }),
            receipts: (data.receipts || []).map((r: any) => ({
              ...r,
              currency: r.currency || data.currency || 'USD',
            })),
            payments: (data.payments || []).map((p: any) => ({
              ...p,
              currency: p.currency || data.currency || 'USD',
            })),
          };
          toast.success('Expediente decodificado con IA');
        } else if (error) {
          console.warn('parse-pdf returned error:', error);
        }
      } catch (err) {
        console.warn('AI Parsing failed, falling back to local regex...', err);
      }

      // Fallback local regex parsing
      if (!parsedData || !parsedData.legacyId) {
        parsedData = parseLegacyReservationPDFText(text, pdfItems);
        toast.info('Expediente decodificado con procesador local');
      } else {
        // AI returned a legacyId but possibly missing data â€” merge with local parser
        const localParsed = parseLegacyReservationPDFText(text, pdfItems);
        
        // Use local services if AI returned fewer services (local parser often catches more)
        if (!parsedData.services || parsedData.services.length === 0 || localParsed.services.length > parsedData.services.length) {
          parsedData.services = localParsed.services;
          console.log('[Merge] Using local parser services (found more):', localParsed.services.length, 'vs AI:', parsedData.services?.length || 0);
        }
        // If AI returned no passengers, use local ones
        if (!parsedData.passengers || parsedData.passengers.length === 0) {
          parsedData.passengers = localParsed.passengers;
          console.log('[Merge] Using local parser passengers:', localParsed.passengers.length);
        }
        // If AI returned no receipts, use local ones
        if (!parsedData.receipts || parsedData.receipts.length === 0) {
          parsedData.receipts = localParsed.receipts;
          console.log('[Merge] Using local parser receipts:', localParsed.receipts.length);
        }
        // If AI returned no payments, use local ones
        if (!parsedData.payments || parsedData.payments.length === 0) {
          parsedData.payments = localParsed.payments;
          console.log('[Merge] Using local parser payments:', localParsed.payments.length);
        }
        // Fill missing header fields from local
        if (!parsedData.agent) parsedData.agent = localParsed.agent;
        if (!parsedData.clientPhone) parsedData.clientPhone = localParsed.clientPhone;
        if (!parsedData.clientAddress) parsedData.clientAddress = localParsed.clientAddress;
        if (!parsedData.startDate) parsedData.startDate = localParsed.startDate;
        if (!parsedData.endDate) parsedData.endDate = localParsed.endDate;
      }

      setReservation(parsedData);

      // Check duplicates and client linkage
      if (user && parsedData.legacyId) {
        // Check duplicate file
        const { data: existingFile } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', user.id)
          .eq('legacy_id', parsedData.legacyId)
          .maybeSingle();

        setIsDuplicate(!!existingFile);

        // Check client lookup in clients
        const { data: matchedClients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id);

        const norm = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

        const match = (matchedClients || []).find(
          c => norm(c.name).includes(norm(parsedData!.clientName)) || norm(parsedData!.clientName).includes(norm(c.name))
        );

        if (match) {
          setMatchedClientId(match.id);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Error al procesar el archivo');
    } finally {
      setParsing(false);
      setProgress('');
    }
  };

  const deleteLegacyFinancials = async (fileId: string) => {
    if (!user) return;
    const { data: oldReceipts } = await supabase
      .from('file_receipts')
      .select('id')
      .eq('file_id', fileId)
      .eq('user_id', user.id)
      .like('notes', `%${LEGACY_NOTE_PREFIX}%`);
    const oldReceiptIds = (oldReceipts || []).map(r => r.id);
    if (oldReceiptIds.length) {
      await supabase.from('file_receipt_items').delete().in('receipt_id', oldReceiptIds).eq('user_id', user.id);
      await supabase.from('file_receipts').delete().in('id', oldReceiptIds).eq('user_id', user.id);
    }
    await supabase.from('file_supplier_payments').delete().eq('file_id', fileId).eq('user_id', user.id);
    await supabase.from('account_movements').delete().eq('file_id', fileId).eq('user_id', user.id);
  };

  const handleImport = async () => {
    if (!user || !reservation) return;
    setImporting(true);
    
    try {
      let clientId = matchedClientId;

      // 1. Create client if doesn't exist and not linked
      if (!clientId) {
        const { data: newCli, error: cliErr } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: reservation.clientName,
            phone: reservation.clientPhone || null,
            address: reservation.clientAddress || null,
            notes: `Creado automÃ¡ticamente durante importaciÃ³n de PDF NÂº ${reservation.legacyId}`
          })
          .select('id')
          .single();
        if (!cliErr && newCli) {
          clientId = newCli.id;
          setMatchedClientId(clientId);
        }
      }

      // 2. Calculations
      const totalCost = reservation.services.reduce((sum, s) => sum + s.cost, 0);
      const totalPrice = reservation.services.reduce((sum, s) => sum + s.price, 0);
      const destination = reservation.services.find(s => s.serviceType === 'lodging')?.description || 
                          reservation.services[0]?.description || 
                          'Viaje HistÃ³rico';

      let fileId = '';

      // 3. Create or update file
      const { data: existing } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user.id)
        .eq('legacy_id', reservation.legacyId)
        .maybeSingle();

      const fileData = {
        client_name: reservation.clientName,
        client_id: clientId,
        destination,
        start_date: reservation.startDate,
        end_date: reservation.endDate,
        travelers: reservation.numPax,
        currency: reservation.currency,
        total_price: totalPrice,
        total_cost: totalCost,
        internal_notes: `${LEGACY_NOTE_PREFIX} (NÂº ${reservation.legacyId}). Vendedor: ${reservation.agent}`,
        status: 'confirmed'
      };

      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('files')
          .update(fileData)
          .eq('id', existing.id);
        
        if (updateErr) throw updateErr;
        fileId = existing.id;

        // Clean dependent rows for replacement
        await supabase.from('file_services').delete().eq('file_id', fileId).eq('user_id', user.id);
        await supabase.from('file_passengers').delete().eq('file_id', fileId).eq('user_id', user.id);
        await deleteLegacyFinancials(fileId);
      } else {
        const { data: created, error: createErr } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            legacy_id: reservation.legacyId,
            ...fileData
          })
          .select('id')
          .single();
        
        if (createErr || !created) throw createErr || new Error('Error al crear expediente');
        fileId = created.id;
      }

      // 4. Insert passengers
      if (reservation.passengers.length > 0) {
        const passengerRows = reservation.passengers.map(p => ({
          user_id: user.id,
          file_id: fileId,
          name: p.name,
          dni: p.dni,
          birth_date: p.birthDate,
          notes: p.type
        }));
        const { error: paxErr } = await supabase.from('file_passengers').insert(passengerRows);
        if (paxErr) throw paxErr;
      }

      // 5. Insert services
      if (reservation.services.length > 0) {
        const serviceRows = reservation.services.map(s => ({
          user_id: user.id,
          file_id: fileId,
          service_type: s.serviceType,
          description: s.description,
          supplier_name: s.supplierName,
          currency: s.currency,
          cost: s.cost,
          price: s.price,
          service_date: s.startDate,
          end_date: s.endDate,
          status: 'confirmed',
          origin: s.origin || null,
          destination: s.destination || null,
          airline: s.airline || null,
          flight_number: s.flightNumber || null,
          cabin_class: s.cabinClass || null,
          regime: s.regime || null,
          room_type: s.roomType || null,
          pickup_location: s.pickupLocation || null,
          dropoff_location: s.dropoffLocation || null,
          company: s.company || null,
          departure_time: s.departureTime || null,
          arrival_time: s.arrivalTime || null,
          luggage: s.luggage || null,
          luggage_type: s.luggageType || null,
          hotel_category: s.hotelCategory || null,
          ship_name: s.shipName || null,
          embarkation_port: s.embarkationPort || null,
          disembarkation_port: s.disembarkationPort || null,
          deck: s.deck || null,
          cabin_number: s.cabinNumber || null,
          coverage: s.coverage || null,
          insurance_plan: s.insurancePlan || null,
        }));
        const { error: svcErr } = await supabase.from('file_services').insert(serviceRows);
        if (svcErr) throw svcErr;
      }

      // 6. Insert receipts (cobros) and account movements
      for (const r of reservation.receipts) {
        const { data: rcpt, error: rcptErr } = await supabase
          .from('file_receipts')
          .insert({
            user_id: user.id,
            file_id: fileId,
            client_name: reservation.clientName,
            concept: r.concept,
            payment_date: r.date || reservation.startDate || new Date().toISOString().slice(0, 10),
            payment_method: 'transfer',
            currency: r.currency,
            amount: r.amount,
            notes: `${LEGACY_NOTE_PREFIX} - cobro pasajero`,
            status: 'paid'
          })
          .select('id')
          .single();

        if (rcptErr || !rcpt) throw rcptErr || new Error('Error al crear cobro');

        const { error: rcptItemErr } = await supabase
          .from('file_receipt_items')
          .insert({
            user_id: user.id,
            receipt_id: rcpt.id,
            currency: r.currency,
            amount: r.amount,
            payment_method: 'transfer',
            notes: `${LEGACY_NOTE_PREFIX} - ${r.currency}`
          });
        
        if (rcptItemErr) throw rcptItemErr;

        if (clientId) {
          const { error: movErr } = await supabase
            .from('account_movements')
            .insert({
              user_id: user.id,
              file_id: fileId,
              account_id: clientId,
              account_type: 'client',
              movement_type: 'credit',
              currency: r.currency,
              amount: r.amount,
              concept: r.concept,
              reference: `LEG-${reservation.legacyId}`,
              movement_date: r.date || reservation.startDate || new Date().toISOString().slice(0, 10),
              notes: `${LEGACY_NOTE_PREFIX} - cobro pasajero`
            });
          if (movErr) throw movErr;
        }
      }

      // 7. Insert operator payments
      if (reservation.payments.length > 0) {
        const supplierPaymentRows = reservation.payments.map(p => ({
          user_id: user.id,
          file_id: fileId,
          supplier_name: p.supplierName,
          currency: p.currency,
          amount: p.amount,
          payment_date: p.date || reservation.startDate || new Date().toISOString().slice(0, 10),
          payment_method: 'transfer',
          reference: `LEG-${reservation.legacyId}`,
          notes: `${LEGACY_NOTE_PREFIX} - pago a ${p.supplierName}`
        }));
        const { error: payErr } = await supabase.from('file_supplier_payments').insert(supplierPaymentRows);
        if (payErr) throw payErr;
      }

      toast.success(existing ? 'Expediente actualizado con Ã©xito' : 'Expediente importado con Ã©xito');
      qc.invalidateQueries({ queryKey: ['files'] });
      handleClose(false);
      navigate(`/files/${fileId}`);
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar la importaciÃ³n');
    } finally {
      setImporting(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <DialogTitle className="flex items-center gap-2 font-sans text-xl font-bold text-primary">
              <FileText className="h-6 w-6" />
              Importar Expediente desde PDF HistÃ³rico
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              SubÃ­ el PDF detallado del expediente de la app anterior para migrar todos sus pasajeros, servicios, cobros y pagos.
            </DialogDescription>
          </div>
        </DialogHeader>

        {!reservation && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <label className="cursor-pointer flex flex-col items-center gap-4 p-12 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted/30 transition-all w-full max-w-md shadow-sm">
              <Upload className="h-12 w-12 text-muted-foreground animate-pulse" />
              <div className="text-center">
                <p className="font-semibold text-lg">Seleccionar archivo PDF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {parsing ? progress : 'PDF detallado del expediente (Max 10MB)'}
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={parsing}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            {parsing && (
              <div className="w-full max-w-md space-y-2 mt-2">
                <Progress value={progress.includes('IA') ? 85 : progress.includes('pÃ¡gina') ? 50 : 20} className="h-2" />
                <p className="text-xs text-muted-foreground text-center animate-pulse">{progress}</p>
              </div>
            )}
          </div>
        )}

        {reservation && (
          <>
            {/* Alerts */}
            <div className="flex flex-col gap-2 mt-4">
              {isDuplicate && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-600 text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Expediente Duplicado</span>: Ya existe una reserva con el nÃºmero <span className="font-mono font-bold">#{reservation.legacyId}</span>. Si continÃºas, se sobrescribirÃ¡n los servicios, pasajeros y cobros antiguos de este expediente.
                  </div>
                </div>
              )}
              {matchedClientId ? (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-green-500/30 bg-green-500/5 text-green-600 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Cliente Vinculado</span>: Se asociarÃ¡ automÃ¡ticamente con el cliente existente <span className="font-bold">"{reservation.clientName}"</span>.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-600 text-sm">
                  <Users className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Nuevo Cliente</span>: No se encontrÃ³ un cliente en el CRM con el nombre <span className="font-bold">"{reservation.clientName}"</span>. Se crearÃ¡ un nuevo registro de cliente automÃ¡ticamente para vincular la cuenta corriente.
                  </div>
                </div>
              )}
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden mt-4 flex flex-col">
              <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="!grid w-full !grid-cols-4 shrink-0 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="general" className="rounded-lg">Ficha General</TabsTrigger>
                  <TabsTrigger value="passengers" className="rounded-lg">Pasajeros ({reservation.passengers.length})</TabsTrigger>
                  <TabsTrigger value="services" className="rounded-lg">Servicios ({reservation.services.length})</TabsTrigger>
                  <TabsTrigger value="financial" className="rounded-lg">Cobros y Pagos</TabsTrigger>
                </TabsList>

                {/* Tab General */}
                <TabsContent value="general" className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Reserva NÂ°</p>
                      <p className="font-mono text-lg font-bold text-primary mt-1">#{reservation.legacyId}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Vendedor</p>
                      <p className="text-sm font-semibold mt-1 truncate">{reservation.agent || 'Sin vendedor'}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Fecha Salida</p>
                      <p className="text-sm font-semibold mt-1">
                        {reservation.startDate ? new Date(reservation.startDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Pasajeros</p>
                      <p className="text-sm font-semibold mt-1">{reservation.numPax} pax</p>
                    </div>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del Cliente</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mt-1">
                      <div><span className="text-muted-foreground">Nombre:</span> <strong className="font-semibold text-foreground">{reservation.clientName}</strong></div>
                      <div><span className="text-muted-foreground">Celular:</span> <span className="font-medium text-foreground">{reservation.clientPhone || 'No indica'}</span></div>
                      <div><span className="text-muted-foreground">DirecciÃ³n:</span> <span className="font-medium text-foreground">{reservation.clientAddress || 'No indica'}</span></div>
                    </div>
                  </div>

                  {(() => {
                    // Group by currency
                    const priceByCur: Record<string, number> = {};
                    const costByCur: Record<string, number> = {};
                    reservation.services.forEach(s => {
                      const cur = s.currency || reservation.currency;
                      priceByCur[cur] = (priceByCur[cur] || 0) + s.price;
                      costByCur[cur] = (costByCur[cur] || 0) + s.cost;
                    });
                    const curs = Array.from(new Set([...Object.keys(priceByCur), ...Object.keys(costByCur)])).sort();

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase text-green-600">Total Venta</p>
                            <Badge variant="outline" className="border-green-500/30 text-green-700 bg-green-500/10">Venta</Badge>
                          </div>
                          <div className="space-y-1">
                            {curs.map(cur => (
                              <p key={cur} className="text-xl font-bold text-green-700">
                                {cur} {fmt(priceByCur[cur] || 0)}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase text-orange-600">Total Costo</p>
                            <Badge variant="outline" className="border-orange-500/30 text-orange-700 bg-orange-500/10">Costo</Badge>
                          </div>
                          <div className="space-y-1">
                            {curs.map(cur => (
                              <p key={cur} className="text-xl font-bold text-orange-700">
                                {cur} {fmt(costByCur[cur] || 0)}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Tab Pasajeros */}
                <TabsContent value="passengers" className="flex-1 overflow-y-auto pt-4 pr-1">
                  {reservation.passengers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No se encontraron pasajeros en el documento.</div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-xs uppercase text-muted-foreground border-b">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Nombre</th>
                            <th className="px-4 py-3 font-semibold">DNI</th>
                            <th className="px-4 py-3 font-semibold">F. Nacimiento</th>
                            <th className="px-4 py-3 font-semibold">Tipo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reservation.passengers.map((p, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium text-foreground uppercase">{p.name}</td>
                              <td className="px-4 py-3 font-mono">{p.dni || '-'}</td>
                              <td className="px-4 py-3">
                                {p.birthDate ? new Date(p.birthDate).toLocaleDateString('es-AR') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={p.type === 'MENOR' ? 'secondary' : 'default'} className="text-[10px]">
                                  {p.type}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Servicios */}
                <TabsContent value="services" className="flex-1 overflow-y-auto pt-4 pr-1 space-y-3">
                  {reservation.services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No se encontraron servicios en el documento.</div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-xs uppercase text-muted-foreground border-b">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Tipo</th>
                            <th className="px-4 py-3 font-semibold">Proveedor / Detalle</th>
                            <th className="px-4 py-3 font-semibold">Fechas</th>
                            <th className="px-4 py-3 font-semibold text-right">Costo</th>
                            <th className="px-4 py-3 font-semibold text-right">Venta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reservation.services.map((s, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 text-xs">
                              <td className="px-4 py-3 font-semibold capitalize">{s.serviceType}</td>
                              <td className="px-4 py-3">
                                <strong className="font-semibold text-foreground uppercase">{s.supplierName}</strong>
                                <p className="text-muted-foreground mt-0.5 text-[11px] font-normal uppercase">{s.description}</p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {s.startDate ? new Date(s.startDate).toLocaleDateString('es-AR') : '-'}
                                {s.endDate && ` â†’ ${new Date(s.endDate).toLocaleDateString('es-AR')}`}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-medium text-orange-600">
                                {s.currency} {fmt(s.cost)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-green-600">
                                {s.currency} {fmt(s.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Financiero */}
                <TabsContent value="financial" className="flex-1 overflow-y-auto pt-4 pr-1 space-y-6">
                  {/* Cobros */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-1.5 text-primary">
                      <Receipt className="h-4 w-4" /> Cobros Pasajero ({reservation.receipts.length})
                    </h4>
                    {reservation.receipts.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-1">No se detectaron cobros del cliente.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground border-b uppercase">
                            <tr>
                              <th className="px-3 py-2.5 font-semibold">Concepto / Recibo</th>
                              <th className="px-3 py-2.5 font-semibold">Fecha</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Importe</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {reservation.receipts.map((r, idx) => (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="px-3 py-2.5 font-medium uppercase">{r.concept}</td>
                                <td className="px-3 py-2.5">
                                  {r.date ? new Date(r.date).toLocaleDateString('es-AR') : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-green-600">
                                  {r.currency} {fmt(r.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pagos */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-1.5 text-primary">
                      <Wallet className="h-4 w-4" /> Pagos a Operadores ({reservation.payments.length})
                    </h4>
                    {reservation.payments.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-1">No se detectaron pagos a operadores.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground border-b uppercase">
                            <tr>
                              <th className="px-3 py-2.5 font-semibold">Operador / Proveedor</th>
                              <th className="px-3 py-2.5 font-semibold">Fecha</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Importe Pagado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {reservation.payments.map((p, idx) => (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="px-3 py-2.5 font-medium uppercase">{p.supplierName}</td>
                                <td className="px-3 py-2.5">
                                  {p.date ? new Date(p.date).toLocaleDateString('es-AR') : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600">
                                  {p.currency} {fmt(p.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="mt-4 pt-4 border-t gap-2">
              <Button variant="outline" onClick={() => reset()} disabled={importing}>
                Cambiar archivo
              </Button>
              <Button onClick={handleImport} disabled={importing} className="gap-1">
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {isDuplicate ? 'Reemplazar Expediente' : 'Confirmar ImportaciÃ³n'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
