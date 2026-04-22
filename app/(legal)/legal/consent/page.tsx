import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Scale, Shield, Clock, Users } from "lucide-react"

export const metadata = {
  title: "Согласие на обработку ПДн | InvestTrack",
  description: "Форма согласия на обработку персональных данных",
}

export default function ConsentPage() {
  return (
    <Card>
      <CardHeader className="bg-blue-50">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-blue-600" />
          <div>
            <CardTitle className="text-2xl">Согласие на обработку персональных данных</CardTitle>
            <p className="text-sm text-blue-600 mt-1">Федеральный закон № 152-ФЗ</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none pt-6">
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <p className="text-gray-700 text-sm mb-2">
            <strong>Я, субъект персональных данных,</strong> даю свое добровольное, осознанное 
            и информированное согласие на обработку моих персональных данных Оператору 
            сервиса InvestTrack.
          </p>
          <p className="text-gray-600 text-sm mb-0">
            Дата выдачи согласия: при регистрации в сервисе
          </p>
        </div>

        <h3 className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Состав персональных данных
        </h3>

        <div className="grid md:grid-cols-2 gap-4 not-prose">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Основные данные</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>ФИО</li>
              <li>Email, телефон</li>
              <li>Адрес регистрации</li>
              <li>Дата рождения</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Финансовая информация</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Данные об активах</li>
              <li>История транзакций</li>
              <li>Размеры инвестиций</li>
              <li>Инвестиционные цели</li>
            </ul>
          </div>
        </div>

        <h3 className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Цели и сроки обработки
        </h3>

        <div className="overflow-x-auto not-prose">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">Цель</th>
                <th className="border border-gray-200 px-4 py-2 text-left">Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-4 py-2">Регистрация и аутентификация</td>
                <td className="border border-gray-200 px-4 py-2">Весь период использования</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2">Предоставление услуг</td>
                <td className="border border-gray-200 px-4 py-2">Весь период использования</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2">Соблюдение ПОД/ФТ</td>
                <td className="border border-gray-200 px-4 py-2">5 лет</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2">Налоговая отчётность</td>
                <td className="border border-gray-200 px-4 py-2">5 лет</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Передача третьим лицам
        </h3>

        <p>Согласие предоставляется на передачу данных:</p>
        <ul>
          <li><strong>Обработчикам:</strong> хостинг, email-рассылки, аналитика</li>
          <li><strong>Государственным органам:</strong> по запросу в установленном порядке</li>
          <li><strong>Трансграничная передача:</strong> не осуществляется</li>
        </ul>

        <h3>Права субъекта ПДн</h3>
        <div className="grid md:grid-cols-2 gap-4 not-prose">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Ваши права:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>Получить информацию об обработке</li>
              <li>Требовать уточнения данных</li>
              <li>Требовать удаления данных</li>
              <li>Отозвать согласие</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Как отозвать:</h4>
            <p className="text-sm text-blue-700">
              Через личный кабинет или по email: privacy@investtrack.ru<br />
              <strong>Внимание:</strong> отзыв приводит к удалению аккаунта.
            </p>
          </div>
        </div>

        <h3>Подтверждение</h3>
        <p>Используя сервис, вы подтверждаете:</p>
        <div className="space-y-3 not-prose">
          <div className="flex items-start gap-3">
            <Checkbox id="confirm1" disabled checked />
            <Label htmlFor="confirm1" className="text-sm text-gray-700">
              Ознакомлен с Политикой конфиденциальности
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="confirm2" disabled checked />
            <Label htmlFor="confirm2" className="text-sm text-gray-700">
              Понимаю цели и условия обработки ПДн
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="confirm3" disabled checked />
            <Label htmlFor="confirm3" className="text-sm text-gray-700">
              Даю согласие добровольно и осознанно
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="confirm4" disabled checked />
            <Label htmlFor="confirm4" className="text-sm text-gray-700">
              Известны мои права как субъекта ПДн
            </Label>
          </div>
        </div>

        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-6 mt-8">
          <h4 className="font-semibold text-blue-900 mb-2">Контакты для вопросов</h4>
          <p className="text-blue-800 text-sm">
            Email: privacy@investtrack.ru<br />
            Форма обратной связи: в личном кабинете
          </p>
        </div>

        <hr className="my-6" />
        <p className="text-sm text-gray-500">
          Согласие действует до достижения целей обработки, отзыва согласия или истечения 
          установленных законом сроков.
        </p>
      </CardContent>
    </Card>
  )
}
