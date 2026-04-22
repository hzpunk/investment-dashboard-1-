"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CreditCard,
  DollarSign,
  Goal,
  Home,
  PieChart,
  Settings,
  Wallet,
  Users,
  Shield,
  X,
  Database,
  Bell,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, userRole } = useAuth()

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (open && onClose) {
      onClose()
    }
  }, [pathname, open, onClose])

  // Check if user is admin
  const isAdmin = userRole === "admin"

  const sidebarItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Accounts",
      href: "/accounts",
      icon: CreditCard,
    },
    {
      title: "Assets",
      href: "/assets",
      icon: DollarSign,
    },
    {
      title: "Portfolios",
      href: "/portfolios",
      icon: PieChart,
    },
    {
      title: "Transactions",
      href: "/transactions",
      icon: Wallet,
    },
    {
      title: "Goals",
      href: "/goals",
      icon: Goal,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  // Admin section items
  const adminItems = [
    {
      title: "User Management",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Security",
      href: "/admin/security",
      icon: Shield,
    },
    {
      title: "Asset Database",
      href: "/admin/assets",
      icon: Database,
    },
    {
      title: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
    },
    {
      title: "System Processes",
      href: "/admin/processes",
      icon: RefreshCw,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <BarChart3 className="h-6 w-6" />
              <span>InvestTrack</span>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>
          <nav className="flex-1 overflow-auto p-2">
            <ul className="grid gap-1">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                      pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              ))}

              {/* Admin section */}
              {isAdmin && (
                <>
                  <li className="mt-6 px-3 text-xs font-semibold text-muted-foreground">Administration</li>
                  {adminItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                          pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}

