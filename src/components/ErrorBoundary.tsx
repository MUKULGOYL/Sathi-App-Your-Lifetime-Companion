import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  featureName?: string;
  fallbackMessageEn?: string;
  fallbackMessageHi?: string;
  language?: 'en' | 'hi';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary caught in ${this.props.featureName || 'feature'}]:`, error, errorInfo);
  }

  public handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const isHi = this.props.language === 'hi';
      const title = isHi ? 'कुछ गड़बड़ हो गई' : 'Something went wrong';
      const message =
        (isHi ? this.props.fallbackMessageHi : this.props.fallbackMessageEn) ||
        (isHi
          ? 'इस भाग को लोड करने में परेशानी हुई। कृपया फिर से कोशिश करें।'
          : 'Unable to load this section right now. Please try again.');
      const tryAgainLabel = isHi ? 'पुनः प्रयास करें' : 'Try Again';

      return (
        <div
          role="alert"
          className="p-8 my-6 bg-[#FDE8E8] border-2 border-[#C62828] rounded-3xl text-center flex flex-col items-center gap-4 max-w-xl mx-auto shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#C62828] text-white flex items-center justify-center text-3xl font-bold">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-[#C62828]">{title}</h2>
          <p className="text-lg text-[#0F2A33] leading-relaxed">{message}</p>
          <Button
            type="button"
            variant="danger"
            onClick={this.handleReset}
            icon={<RefreshCw className="w-5 h-5" />}
          >
            {tryAgainLabel}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
