import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in section ${this.props.sectionName || ''}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="my-4 border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-500 animate-bounce" />
            <div>
              <h3 className="font-semibold text-lg">Ocurrió un inconveniente en esta sección</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {this.props.sectionName ? `Ocurrió un error al cargar ${this.props.sectionName}.` : 'Ocurrió un error al renderizar este componente.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar cargar sección
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}