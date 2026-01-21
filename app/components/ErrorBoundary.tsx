"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "./ui/Icons";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console (in production, you might want to log to an error reporting service)
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // TODO: In production, send error to error reporting service (e.g., Sentry, LogRocket)
        // Example:
        // if (process.env.NODE_ENV === 'production') {
        //     Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
        // }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
                    <div className="max-w-2xl w-full bg-surface-primary rounded-lg shadow-lg p-6 md:p-8 border border-border-primary">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">
                                    เกิดข้อผิดพลาด
                                </h1>
                                <p className="text-text-secondary mt-1">
                                    Something went wrong
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                                Error Details:
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">
                                {this.state.error?.message || "Unknown error occurred"}
                            </p>
                        </div>

                        {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                            <details className="mb-6">
                                <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary mb-2">
                                    Component Stack (Development Only)
                                </summary>
                                <pre className="text-xs bg-surface-secondary p-4 rounded overflow-auto max-h-64 text-text-secondary font-mono">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                            >
                                <RefreshCwIcon className="w-4 h-4" />
                                ลองอีกครั้ง
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-primary rounded-lg transition-colors border border-border-primary"
                            >
                                <RefreshCwIcon className="w-4 h-4" />
                                โหลดหน้าใหม่
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-primary rounded-lg transition-colors border border-border-primary"
                            >
                                <HomeIcon className="w-4 h-4" />
                                กลับหน้าแรก
                            </button>
                        </div>

                        <p className="text-xs text-text-secondary mt-6 text-center">
                            หากปัญหายังคงอยู่ กรุณาติดต่อทีมพัฒนา
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
