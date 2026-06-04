import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-red-100 p-6">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Algo salió mal</h2>
          <p className="mt-2 text-slate-500 max-w-md">
            Ha ocurrido un error inesperado en la aplicación. Por favor, intenta recargar la página.
          </p>
          <pre className="mt-4 max-w-full overflow-auto rounded-lg bg-slate-100 p-4 text-left text-xs text-slate-600">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar Aplicación
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
