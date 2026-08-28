import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logSystemError } from './errorLogger';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('errorLogger module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format error and call supabase insert without throwing', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user-123' } } },
    });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { agency_id: 'test-agency-456' } }),
          }),
        }),
      }),
      insert: mockInsert,
    });

    const error = new Error('Test crash');
    await expect(
      logSystemError({
        error,
        componentName: 'TestComponent',
      })
    ).resolves.not.toThrow();

    expect(supabase.from).toHaveBeenCalledWith('system_errors_log');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should not throw even if supabase call rejects (fail-safe)', async () => {
    (supabase.auth.getSession as any).mockRejectedValue(new Error('Network error'));

    await expect(
      logSystemError({
        error: 'String error occurred',
        componentName: 'FaultyComponent',
      })
    ).resolves.not.toThrow();
  });
});
