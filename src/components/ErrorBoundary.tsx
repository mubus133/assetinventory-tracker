import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private parseError(error: Error) {
    try {
      return JSON.parse(error.message);
    } catch {
      return null;
    }
  }

  public render() {
    if (this.state.hasError) {
      const firestoreError = this.state.error ? this.parseError(this.state.error) : null;

      return (
        <div className="min-h-screen bg-bg-deep flex items-center justify-center p-6">
          <div className="bg-bg-card border border-red-500/20 max-w-lg w-full rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">System Interruption</h1>
            <p className="text-text-secondary text-sm mb-6">
              {firestoreError 
                ? `An error occurred during a ${firestoreError.operationType} operation on ${firestoreError.path}.`
                : "The application encountered an unexpected error. Please try refreshing the page."}
            </p>
            {firestoreError && (
              <div className="bg-bg-deep p-4 rounded-lg text-left mb-6 font-mono text-[10px] text-red-400 border border-red-900/20 overflow-x-auto">
                <p>Path: {firestoreError.path}</p>
                <p>Operation: {firestoreError.operationType}</p>
                <p>Detail: {firestoreError.error}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full btn-accent py-3 font-bold uppercase tracking-widest text-xs"
            >
              Refresh Console
            </button>
            <p className="mt-6 text-[10px] text-text-secondary uppercase tracking-widest font-bold">
              Crescent ICT Incident Response
            </p>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
