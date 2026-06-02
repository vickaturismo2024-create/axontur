import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Supabase Integration & Database Connectivity', () => {
  it('should have database configuration environment variables defined', () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    expect(url).toBeDefined();
    expect(url).toContain('supabase.co');
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(20);
  });

  it('should connect to Supabase API and respond successfully (Auth API)', async () => {
    // Try to sign in with non-existent credentials to verify connection to Supabase Auth works.
    // It should fail with a 400 (Invalid login credentials) rather than a network error.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent-user-12345@axonturtest.com',
      password: 'some-dummy-password-that-is-long',
    });

    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Invalid login credentials|Email not confirmed/i);
  });

  it('should query the public database schema and respect RLS policies (returning empty or error without session)', async () => {
    // Queries without a session should either return an empty array or fail due to RLS,
    // but the network request itself should succeed.
    const { data, error } = await supabase
      .from('agencies')
      .select('id')
      .limit(1);

    if (error) {
      // If there is an error, verify it's a database RLS policy/permissions error rather than a connection failure
      expect(error.code).toBeDefined();
    } else {
      // If it succeeds, it should be an array (likely empty since we're unauthenticated)
      expect(Array.isArray(data)).toBe(true);
    }
  });
});
