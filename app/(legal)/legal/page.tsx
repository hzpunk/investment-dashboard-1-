"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Shield, AlertTriangle, Cookie, Scale } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"

export default function LegalPage() {
  const { t } = useI18n()

  const documents = [
    {
      title: t("legalPrivacy.title"),
      description: t("legalPrivacy.shortDescription"),
      icon: Shield,
      href: "/legal/privacy",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      required: true,
    },
    {
      title: t("legalTerms.title"),
      description: t("legalTerms.shortDescription"),
      icon: FileText,
      href: "/legal/terms",
      color: "text-green-600",
      bgColor: "bg-green-100",
      required: true,
    },
    {
      title: t("legalRisks.title"),
      description: t("legalRisks.shortDescription"),
      icon: AlertTriangle,
      href: "/legal/risks",
      color: "text-red-600",
      bgColor: "bg-red-100",
      required: true,
    },
    {
      title: t("legalCookies.title"),
      description: t("legalCookies.shortDescription"),
      icon: Cookie,
      href: "/legal/cookies",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      required: false,
    },
    {
      title: t("legalConsent.title"),
      description: t("legalConsent.shortDescription"),
      icon: Scale,
      href: "/legal/consent",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      required: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t("legal.title")}</h1>
        <p className="mt-2 text-gray-600">{t("legalPage.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((doc) => {
          const Icon = doc.icon
          return (
            <Link key={doc.href} href={doc.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${doc.bgColor}`}>
                      <Icon className={`h-6 w-6 ${doc.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        {doc.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            {t("legal.required")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card className="bg-gray-100 border-0">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">{t("legal.important")}</h3>
          <p className="text-sm text-gray-600">
            {t("legalPage.importantPrefix")}{" "}
            <Link href="/legal/privacy" className="text-blue-600 hover:underline">
              {t("legalPrivacy.title")}
            </Link>{" "}
            {t("legalPage.and")}{" "}
            <Link href="/legal/terms" className="text-blue-600 hover:underline">
              {t("legalTerms.title")}
            </Link>
            {t("legalPage.importantSuffix")}
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>
          {t("legalPage.questions")}{" "}
          <a href="mailto:legal@investtrack.ru" className="text-blue-600 hover:underline">
            legal@investtrack.ru
          </a>
        </p>
        <p className="mt-1">{t("legalPage.jurisdiction")}</p>
      </div>
    </div>
  )
}
