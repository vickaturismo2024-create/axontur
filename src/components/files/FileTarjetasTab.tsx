import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react';

interface AgencyCard {
  id: string;
  alias: string;
  banco: string | null;
  vencimiento: string | null;
  ultimos_4: string | null;
  nro_tarjeta: string | null;
}

interface Props {
  fileId: string;
}

export function FileTarjetasTab({ fileId }: Props) {
  const { user, agencyId } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<AgencyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !agencyId) return;
      const { data } = await supabase
        .from('agency_cards')
        .select('id, alias, banco, vencimiento, ultimos_4, nro_tarjeta')
        .eq('agency_id', agencyId)
        .order('alias');
      setCards((data as unknown as AgencyCard[]) || []);
      setLoading(false);
    };
    load();
  }, [user, agencyId]);

  if (loading) return (
    <div className="py-8 text-center text-muted-foreground">Cargando tarjetas...</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tarjetas disponibles ({cards.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/settings')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Gestionar tarjetas
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tarjetas de la agencia disponibles para registrar pagos a proveedores desde la pestaña Operadores.
      </p>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No hay tarjetas configuradas</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Agregá las tarjetas de la agencia desde Configuración
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/settings')}
            >
              Ir a Configuración
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(card => (
            <Card key={card.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{card.alias}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {card.banco && <span>{card.banco}</span>}
                    {card.ultimos_4 && (
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5">
                        **** {card.ultimos_4}
                      </Badge>
                    )}
                    {card.vencimiento && <span>{card.vencimiento}</span>}
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
