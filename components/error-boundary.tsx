"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { defaultLocale, t as translate } from "@/lib/i18n"

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
        <div className="rounded-lg border bg-red-50 p-4 text-red-600">
          <p className="font-medium">{translate(defaultLocale, "errors.somethingWentWrong")}</p>
          <p className="text-sm">{translate(defaultLocale, "errors.tryReload")}</p>
        </div>
      )
    }

    return this.props.children
  }
}

export function SafeWidget({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border bg-gray-50 p-4">
          {title ? <p className="font-medium text-gray-400">{title}</p> : null}
          <p className="text-sm text-gray-400">{translate(defaultLocale, "errors.unavailable")}</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
