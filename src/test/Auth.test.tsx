import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Auth from '@/pages/Auth';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const { mockNavigate, mockGetParam } = vi.hoisted(() => {
  return {
    mockNavigate: vi.fn(),
    mockGetParam: vi.fn(() => null),
  };
});

// Mock react-router-dom hooks
vi.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useSearchParams: () => [{ get: mockGetParam }],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

// Mock useAuth context hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
  })),
}));

// Mock toast notification library
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  Compass: () => <div />,
  Eye: () => <div />,
  EyeOff: () => <div />,
}));

// Mock Shadcn UI Tabs to avoid Radix UI PointerEvent incompatibilities in JSDOM
const TabsContext = React.createContext<any>(null);
vi.mock('@/components/ui/tabs', () => {
  return {
    Tabs: ({ children, value, onValueChange }: any) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div data-testid="tabs">{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: any) => {
      const ctx = React.useContext(TabsContext);
      const active = ctx?.value === value;
      return (
        <button
          role="tab"
          aria-selected={active}
          onClick={() => ctx?.onValueChange?.(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({ children, value }: any) => {
      const ctx = React.useContext(TabsContext);
      const active = ctx?.value === value;
      if (!active) return null;
      return <div>{children}</div>;
    },
  };
});

describe('Auth Page Component', () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetParam.mockReturnValue(null);
    mockNavigate.mockReset();
    
    (useAuth as any).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
    });
  });

  it('renders login tab by default with email and password fields', () => {
    mockGetParam.mockReturnValue(null);
    render(<Auth />);
    
    expect(screen.getByText('Bienvenido a AxonTur')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  });

  it('switches to register tab when clicked', async () => {
    render(<Auth />);
    
    const registerTab = screen.getByRole('tab', { name: 'Registrarse' });
    fireEvent.click(registerTab);
    
    // Once in register tab, we should see the confirm password field
    expect(await screen.findByLabelText(/Confirmar Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Cuenta' })).toBeInTheDocument();
  });

  it('submits login details and redirects to default root path on success', async () => {
    mockGetParam.mockReturnValue(null); // No redirect param
    mockSignIn.mockResolvedValueOnce({ error: null });
    
    render(<Auth />);
    
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'user@agencia.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'pass123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@agencia.com', 'pass123');
      expect(toast.success).toHaveBeenCalledWith('¡Bienvenido!');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('submits login details and redirects to specific path if redirect query parameter exists', async () => {
    mockGetParam.mockReturnValue('/accept-invitation?token=123'); // Redirect param provided
    mockSignIn.mockResolvedValueOnce({ error: null });
    
    render(<Auth />);
    
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'user@agencia.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'pass123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@agencia.com', 'pass123');
      expect(mockNavigate).toHaveBeenCalledWith('/accept-invitation?token=123');
    });
  });

  it('submits register details and redirects to root on success if session is created immediately (auto-login)', async () => {
    mockGetParam.mockReturnValue(null);
    mockSignUp.mockResolvedValueOnce({ session: { access_token: '123' }, error: null });
    
    render(<Auth />);
    
    // Switch to register tab
    const registerTab = screen.getByRole('tab', { name: 'Registrarse' });
    fireEvent.click(registerTab);
    
    // Await tab transition
    await screen.findByLabelText(/Confirmar Contraseña/i);
    
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'newUser@agencia.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Contraseña/i), { target: { value: 'secret123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('newUser@agencia.com', 'secret123');
      expect(toast.success).toHaveBeenCalledWith('¡Bienvenido! Registro exitoso.');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('submits register details, stays on login screen, and requests email confirmation if no session is created', async () => {
    mockGetParam.mockReturnValue(null);
    mockSignUp.mockResolvedValueOnce({ session: null, error: null }); // Email verification required
    
    render(<Auth />);
    
    // Switch to register tab
    const registerTab = screen.getByRole('tab', { name: 'Registrarse' });
    fireEvent.click(registerTab);
    
    // Await tab transition
    await screen.findByLabelText(/Confirmar Contraseña/i);
    
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'newUser@agencia.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Contraseña/i), { target: { value: 'secret123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('newUser@agencia.com', 'secret123');
      expect(toast.success).toHaveBeenCalledWith('¡Registro exitoso! Por favor, verificá tu correo electrónico para activar tu cuenta.');
      // Should switch tab back to login and not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('displays error message toast on sign in failure', async () => {
    mockSignIn.mockResolvedValueOnce({ error: new Error('Wrong credentials') });
    
    render(<Auth />);
    
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'user@agencia.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrongpass' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Wrong credentials');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
