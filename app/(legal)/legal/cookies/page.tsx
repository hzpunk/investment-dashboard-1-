import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cookie, Settings, Shield } from "lucide-react"

export const metadata = {
  title: "Политика cookies | InvestTrack",
  description: "Информация об использовании cookies",
}

export default function CookiesPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Cookie className="h-8 w-8 text-yellow-600" />
          <CardTitle className="text-2xl">Политика использования cookies</CardTitle>
        </div>
        <p className="text-sm text-gray-500 mt-2">Последнее обновление: 22 апреля 2026 года</p>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <h3>Что такое cookies?</h3>
        <p>
          Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве 
          при посещении веб-сайтов. Они позволяют сайту запоминать ваши действия и предпочтения.
        </p>

        <h3>Какие cookies мы используем</h3>

        <div className="overflow-x-auto not-prose">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">Категория</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Назначение</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-red-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-red-800">Обязательные</td>
                <td className="border border-gray-200 px-4 py-2">Аутентификация, защита от CSRF</td>
                <td className="border border-gray-200 px-4 py-2">Сессия / 24 часа</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-yellow-800">Функциональные</td>
                <td className="border border-gray-200 px-4 py-2">Тема оформления, язык, настройки</td>
                <td className="border border-gray-200 px-4 py-2">1 год</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-4 py-2 font-medium text-green-800">Аналитические</td>
                <td className="border border-gray-200 px-4 py-2">Статистика использования (Google Analytics)</td>
                <td className="border border-gray-200 px-4 py-2">2 года</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Управление cookies
        </h3>

        <p>Вы можете отключить cookies в настройках браузера:</p>
        <ul>
          <li><strong>Chrome:</strong> Настройки → Конфиденциальность и безопасность → Cookies</li>
          <li><strong>Firefox:</strong> Настройки → Приватность и защита → Cookies</li>
          <li><strong>Safari:</strong> Настройки → Конфиденциальность → Cookies</li>
          <li><strong>Edge:</strong> Настройки → Cookies и разрешения сайтов</li>
        </ul>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Важно:</strong> Отключение обязательных cookies невозможно без нарушения 
            работы сайта. Отключение других типов может ограничить функциональность.
          </p>
        </div>

        <h3 className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Безопасность
        </h3>

        <ul>
          <li>Cookies не содержат персональных данных в открытом виде</li>
          <li>Используется шифрование HTTPS</li>
          <li>HttpOnly flag защищает от XSS-атак</li>
          <li>Secure flag для HTTPS-only соединений</li>
        </ul>

        <h3>Сторонние cookies</h3>
        <p>
          Мы <strong>не используем</strong> сторонние cookies для рекламы, 
          отслеживания на других сайтах или продажи данных маркетологам.
        </p>

        <h3>Контакты</h3>
        <p>
          По вопросам использования cookies:<br />
          Email: privacy@investtrack.ru
        </p>

        <hr className="my-6" />
        <p className="text-sm text-gray-500">
          Увидели незнакомый cookie? Напишите нам — мы проверим.
        </p>
      </CardContent>
    </Card>
  )
}
