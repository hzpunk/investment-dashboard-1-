"use client"

import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border rounded-lg bg-red-50 text-red-600">
          <p className="font-medium">Что-то пошло не так</p>
          <p className="text-sm">Попробуйте обновить страницу</p>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper for dashboard widgets
export function SafeWidget({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border rounded-lg bg-gray-50">
          {title && <p className="font-medium text-gray-400">{title}</p>}
          <p className="text-sm text-gray-400">Недоступно</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
