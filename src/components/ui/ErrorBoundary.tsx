import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logSystemError } from "@/lib/errorLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Registrar el error en la base de datos de forma silenciosa
    logSystemError({
      error,
      errorInfo,
      componentName: this.props.componentName || "ComponentBoundary",
    });
  }

  public handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  public handleGoHome = () => {
    window.location.href = "/";
  };

  public toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[280px] w-full flex flex-col items-center justify-center p-6 bg-card/60 border border-destructive/20 rounded-xl backdrop-blur-sm my-4 shadow-sm animate-fadeIn">
          <div className="flex flex-col items-center text-center max-w-md space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Ocurrió un problema en esta sección
              </h3>
              <p className="text-xs text-muted-foreground">
                El resto de la aplicación sigue funcionando normalmente. El error fue registrado automáticamente para su revisión.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-1.5 text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar sección
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleGoHome}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                Ir al Dashboard
              </Button>
            </div>

            {/* Detalles técnicos colapsables */}
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center justify-center gap-1 mx-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {this.state.showDetails ? "Ocultar detalles" : "Ver detalles técnicos"}
                {this.state.showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 text-left bg-muted/60 p-3 rounded-lg border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-36 max-w-full">
                  <p className="font-bold text-destructive mb-1">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="whitespace-pre-wrap text-[10px] leading-tight">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
