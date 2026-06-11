import { Quote } from '@/types/quote';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { OperativeFields } from '@/components/shared/OperativeFields';

interface InsuranceStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

export function InsuranceStep({ quote, onUpdate }: InsuranceStepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Compañía</Label>
        <Input value={quote.insurance.company} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, company: e.target.value } })} placeholder="Assist Card" />
      </div>
      <div>
        <Label>Plan</Label>
        <Input value={quote.insurance.plan} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, plan: e.target.value } })} placeholder="Premium" />
      </div>
      <div>
        <Label>Cobertura</Label>
        <Input value={quote.insurance.coverage} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, coverage: e.target.value } })} placeholder="USD 150.000" />
      </div>
      <div className="md:col-span-2">
        <Label>Notas</Label>
        <Textarea value={quote.insurance.notes} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, notes: e.target.value } })} placeholder="Cobertura COVID-19 incluida..." rows={2} />
      </div>
      <div className="md:col-span-2">
        <OperativeFields 
          data={quote.insurance} 
          onChange={(updates) => onUpdate({ insurance: { ...quote.insurance, ...updates } })} 
          currency={quote.trip.currency} 
        />
      </div>
      <div>
        <Label>Costo neto ({quote.trip.currency})</Label>
        <Input type="number" min={0} step="0.01" value={quote.insurance.cost || ''} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, cost: parseFloat(e.target.value) || undefined } })} placeholder="0.00" />
      </div>
      <div>
        <Label>Precio venta ({quote.trip.currency})</Label>
        <Input type="number" min={0} step="0.01" value={quote.insurance.price || ''} onChange={(e) => onUpdate({ insurance: { ...quote.insurance, price: parseFloat(e.target.value) || undefined } })} placeholder="0.00" />
      </div>
    </div>
  );
}
