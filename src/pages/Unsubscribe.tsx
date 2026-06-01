import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, MailX } from 'lucide-react';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; email?: string }
  | { kind: 'already' }
  | { kind: 'invalid'; message: string }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', message: 'Falta el token de baja en el link.' });
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setState({ kind: 'invalid', message: data?.error || 'Link inválido o expirado.' });
          return;
        }
        if (data?.alreadyUnsubscribed) {
          setState({ kind: 'already' });
          return;
        }
        setState({ kind: 'ready', email: data?.email });
      } catch (e: any) {
        setState({ kind: 'invalid', message: e?.message || 'No se pudo validar el link.' });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState({ kind: 'submitting' });
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setState({ kind: 'error', message: data?.error || 'No se pudo procesar la baja.' });
        return;
      }
      setState({ kind: 'done' });
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message || 'Error de red.' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <MailX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="font-serif font-bold text-primary">Cancelar suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state.kind === 'loading' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {state.kind === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">
                ¿Querés dejar de recibir emails de AxonTur
                {state.email ? ` en ${state.email}` : ''}?
              </p>
              <Button onClick={confirm} className="w-full">
                Confirmar baja
              </Button>
            </>
          )}
          {state.kind === 'submitting' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {state.kind === 'already' && (
            <div className="space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm">Ya estabas dado de baja.</p>
            </div>
          )}
          {state.kind === 'done' && (
            <div className="space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-sm">Listo. No recibirás más emails de AxonTur.</p>
            </div>
          )}
          {state.kind === 'invalid' && (
            <div className="space-y-2">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
          {state.kind === 'error' && (
            <div className="space-y-2">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button onClick={confirm} variant="outline" className="w-full">
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
