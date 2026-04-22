import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Building2, SlidersHorizontal, Bell, FileText, Mail, Activity } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { AccountTab } from '@/components/settings/AccountTab';
import { AgencyTab } from '@/components/settings/AgencyTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { DocumentsTab } from '@/components/settings/DocumentsTab';
import { EmailTab } from '@/components/settings/EmailTab';
import { InfraTab } from '@/components/settings/InfraTab';

const TABS = ['account', 'agency', 'preferences', 'notifications', 'documents', 'email', 'infraestructura'] as const;
type TabKey = typeof TABS[number];

const Settings = () => {
  const { loading } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('tab') as TabKey) || 'account';
  const [tab, setTab] = useState<TabKey>(TABS.includes(initial) ? initial : 'account');

  useEffect(() => {
    const t = searchParams.get('tab') as TabKey;
    if (t && TABS.includes(t) && t !== tab) setTab(t);
  }, [searchParams]);

  const onTabChange = (v: string) => {
    setTab(v as TabKey);
    setSearchParams({ tab: v }, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" /> Configuración
          </h1>
          <p className="mt-1 text-muted-foreground">
            Personalizá tu cuenta, tu agencia y el comportamiento de la app.
          </p>
        </div>

        <div className="max-w-4xl">
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 h-auto">
              <TabsTrigger value="account" className="gap-1.5"><User className="h-4 w-4" /> Cuenta</TabsTrigger>
              <TabsTrigger value="agency" className="gap-1.5"><Building2 className="h-4 w-4" /> Agencia</TabsTrigger>
              <TabsTrigger value="preferences" className="gap-1.5"><SlidersHorizontal className="h-4 w-4" /> Preferencias</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> Notificaciones</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5"><Mail className="h-4 w-4" /> Email</TabsTrigger>
              <TabsTrigger value="infraestructura" className="gap-1.5"><Activity className="h-4 w-4" /> Infraestructura</TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {tab === 'account' && 'Cuenta y seguridad'}
                  {tab === 'agency' && 'Datos de tu agencia'}
                  {tab === 'preferences' && 'Preferencias de la app'}
                  {tab === 'notifications' && 'Notificaciones y recordatorios'}
                  {tab === 'documents' && 'Numeración y formato de documentos'}
                  {tab === 'email' && 'Configuración de emails'}
                  {tab === 'infraestructura' && 'Estado de infraestructura (email + dominio)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabsContent value="account" className="mt-0"><AccountTab /></TabsContent>
                <TabsContent value="agency" className="mt-0"><AgencyTab /></TabsContent>
                <TabsContent value="preferences" className="mt-0"><PreferencesTab /></TabsContent>
                <TabsContent value="notifications" className="mt-0"><NotificationsTab /></TabsContent>
                <TabsContent value="documents" className="mt-0"><DocumentsTab /></TabsContent>
                <TabsContent value="email" className="mt-0"><EmailTab /></TabsContent>
                <TabsContent value="infraestructura" className="mt-0"><InfraTab /></TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
