import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const mockSubscription = {
    unsubscribe: vi.fn(),
  };
  
  const mockAuth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: mockSubscription } })),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };

  return {
    supabase: {
      auth: mockAuth,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    },
  };
});

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign up a user and return the session and error', async () => {
    const mockSession = { access_token: 'token123', user: { id: 'user123', email: 'test@axontur.com' } };
    
    // Setup signUp mock to return a mock session (auto-login scenario)
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: mockSession.user as any, session: mockSession as any },
      error: null,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.signUp('test@axontur.com', 'password123');
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@axontur.com',
      password: 'password123',
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    expect(response).toEqual({
      session: mockSession,
      error: null,
    });
  });

  it('should sign up a user and return session=null if email confirmation is required', async () => {
    // Setup signUp mock to return session=null (email confirmation required)
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: { id: 'user123', email: 'test@axontur.com' } as any, session: null },
      error: null,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.signUp('test@axontur.com', 'password123');
    });

    expect(response).toEqual({
      session: null,
      error: null,
    });
  });

  it('should handle sign up errors correctly', async () => {
    const authError = { message: 'Email already exists', name: 'AuthError', status: 400 };
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: authError as any,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.signUp('test@axontur.com', 'password123');
    });

    expect(response?.error).toBeInstanceOf(Error);
    expect(response?.error?.message).toBe('Email already exists');
    expect(response?.session).toBeNull();
  });
});
