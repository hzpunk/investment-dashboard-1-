import type React from "react"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
  className?: string
}

export function DashboardHeader({ heading, text, children, className }: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 pb-5", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-bold md:text-3xl">{heading}</h1>
          {text && <p className="text-muted-foreground">{text}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}

