"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/contexts/i18n-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, User } from "lucide-react"
import { NotificationsDropdown } from "@/widgets/notifications/ui/notifications-dropdown"

interface SiteHeaderProps {
  onMenuToggle?: () => void
}

export function SiteHeader({ onMenuToggle }: SiteHeaderProps) {
  const { user, signOut } = useAuth()
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="md:hidden">
          <Button variant="ghost" size="icon" className="mr-2" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t("header.toggleMenu")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span>{t("brand.name")}</span>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationsDropdown />
          <LanguageSwitcher />
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">{t("header.userMenu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">{t("header.settings")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>{t("header.signOut")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

