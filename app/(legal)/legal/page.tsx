import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Shield, AlertTriangle, Cookie, Scale } from "lucide-react"

const documents = [
  {
    title: "Политика конфиденциальности",
    description: "Как мы обрабатываем ваши персональные данные в соответствии с 152-ФЗ",
    icon: Shield,
    href: "/legal/privacy",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    required: true,
  },
  {
    title: "Пользовательское соглашение",
    description: "Правила использования сервиса и условия оказания услуг",
    icon: FileText,
    href: "/legal/terms",
    color: "text-green-600",
    bgColor: "bg-green-100",
    required: true,
  },
  {
    title: "Уведомление о рисках",
    description: "Важная информация об инвестиционных рисках и отказе от ответственности",
    icon: AlertTriangle,
    href: "/legal/risks",
    color: "text-red-600",
    bgColor: "bg-red-100",
    required: true,
  },
  {
    title: "Политика cookies",
    description: "Как мы используем cookies и как управлять ими",
    icon: Cookie,
    href: "/legal/cookies",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    required: false,
  },
  {
    title: "Согласие на обработку ПДн",
    description: "Форма согласия на обработку персональных данных",
    icon: Scale,
    href: "/legal/consent",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    required: false,
  },
]

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Правовая информация</h1>
        <p className="mt-2 text-gray-600">
          Ознакомьтесь с документами, регулирующими использование сервиса
        </p>
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
                            Обязательно
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
          <h3 className="font-semibold text-gray-900 mb-2">Важно!</h3>
          <p className="text-sm text-gray-600">
            Использование сервиса означает согласие с{" "}
            <Link href="/legal/privacy" className="text-blue-600 hover:underline">
              Политикой конфиденциальности
            </Link>{" "}
            и{" "}
            <Link href="/legal/terms" className="text-blue-600 hover:underline">
              Пользовательским соглашением
            </Link>
            . Пожалуйста, внимательно ознакомьтесь с этими документами перед регистрацией.
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>По всем вопросам: <a href="mailto:legal@investtrack.ru" className="text-blue-600 hover:underline">legal@investtrack.ru</a></p>
        <p className="mt-1">Действует законодательство Российской Федерации</p>
      </div>
    </div>
  )
}
