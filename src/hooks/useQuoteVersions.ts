import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuoteVersion } from '@/types/quote';
import { toast } from 'sonner';

export function useQuoteVersions(quoteId: string | undefined) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!quoteId || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_versions' as any)
        .select('*')
        .eq('quote_id', quoteId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      setVersions((data || []).map((v: any) => ({
        id: v.id,
        quoteId: v.quote_id,
        versionNumber: v.version_number,
        data: v.data,
        createdAt: v.created_at,
      })));
    } catch (e) {
      console.error('Error fetching versions:', e);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, user]);

  const saveVersion = useCallback(async (quoteData: any) => {
    if (!quoteId || !user) return;
    try {
      // Get next version number
      const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
      const { error } = await supabase
        .from('quote_versions' as any)
        .insert({
          quote_id: quoteId,
          version_number: nextVersion,
          data: quoteData,
          user_id: user.id,
        } as any);
      if (error) throw error;
      await fetchVersions();
    } catch (e) {
      console.error('Error saving version:', e);
    }
  }, [quoteId, user, versions, fetchVersions]);

  return { versions, isLoading, fetchVersions, saveVersion };
}
