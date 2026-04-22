import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, TrendingDown, Shield, Ban } from "lucide-react"

export const metadata = {
  title: "Уведомление о рисках | InvestTrack",
  description: "Важная информация об инвестиционных рисках",
}

export default function RisksPage() {
  return (
    <Card>
      <CardHeader className="bg-red-50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <CardTitle className="text-2xl text-red-800">Уведомление о рисках</CardTitle>
            <p className="text-sm text-red-600 mt-1">Внимательно прочитайте перед использованием</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none pt-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            InvestTrack — информационный сервис. Мы не даём инвестиционных рекомендаций.
          </p>
        </div>

        <h3 className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Инвестиционные риски
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 not-prose">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">Риск потери капитала</h4>
            <p className="text-sm text-red-700">
              Вы можете потерять часть или все вложенные средства. 
              Инвестиции всегда сопряжены с риском.
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-2">Рыночные риски</h4>
            <p className="text-sm text-orange-700">
              Валютный риск, процентный риск, инфляция, ликвидность.
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Специфические риски</h4>
            <p className="text-sm text-yellow-700">
              Волатильность акций, дефолт облигаций, риски криптовалют.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Технические риски</h4>
            <p className="text-sm text-blue-700">
              Сбои в работе, потеря данных, неточность расчётов.
            </p>
          </div>
        </div>

        <h3 className="flex items-center gap-2 mt-8">
          <Ban className="h-5 w-5 text-red-500" />
          Отказ от ответственности
        </h3>

        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="font-medium text-gray-900 mb-2">Сервис НЕ предоставляет:</p>
          <ul className="text-gray-700 text-sm mb-0">
            <li>Инвестиционных рекомендаций</li>
            <li>Финансового консультирования</li>
            <li>Управления активами</li>
            <li>Брокерских услуг</li>
          </ul>
        </div>

        <p className="text-red-600 font-medium">
          Вся информация на сайте носит справочно-образовательный характер.
        </p>

        <h3 className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Рекомендации по управлению рисками
        </h3>

        <ul>
          <li><strong>Диверсификация:</strong> Не вкладывайте все средства в один актив</li>
          <li><strong>Разумный объём:</strong> Инвестируйте только свободные средства</li>
          <li><strong>Образование:</strong> Изучайте основы инвестирования</li>
          <li><strong>Консультации:</strong> При необходимости обратитесь к лицензированным специалистам</li>
        </ul>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">Используя сервис, вы подтверждаете:</h4>
          <ul className="text-green-700 text-sm mb-0">
            <li>Понимание всех описанных рисков</li>
            <li>Готовность понести убытки</li>
            <li>Самостоятельность принятия решений</li>
            <li>Необходимость консультации с профессионалами</li>
          </ul>
        </div>

        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 text-center mt-8">
          <p className="text-red-800 font-bold text-lg mb-2">
            Если вы не согласны с рисками — не используйте сервис.
          </p>
          <p className="text-red-600 text-sm">
            При несогласии закройте сайт и удалите аккаунт.
          </p>
        </div>

        <hr className="my-6" />
        <p className="text-sm text-gray-500">
          Дата обновления: 22 апреля 2026 года
        </p>
      </CardContent>
    </Card>
  )
}
