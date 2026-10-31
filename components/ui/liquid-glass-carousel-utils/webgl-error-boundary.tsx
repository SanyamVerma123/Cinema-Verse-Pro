"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface WebGLErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WebGLErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WebGLErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <WebGLFallback message="WebGL encountered a rendering error." />
        )
      );
    }
    return this.props.children;
  }
}

export interface WebGLFallbackProps {
  className?: string;
  message?: string;
}

export function WebGLFallback({
  className = "",
  message = "This carousel needs WebGL, which is unavailable in this browser.",
}: WebGLFallbackProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-black/80 text-white/80 p-6 text-center ${className}`}
    >
      <AlertTriangle className="w-8 h-8 mb-2 text-amber-400 opacity-80" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
