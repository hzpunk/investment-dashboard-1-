import type { Locale } from "@/lib/i18n"

export type LegalTextBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "h4"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "callout"; tone: "info" | "warning" | "danger" | "success"; title?: string; text: string; items?: string[] }
  | {
      kind: "table"
      headers: string[]
      rows: string[][]
      rowTones?: ("default" | "danger" | "warning" | "success" | "info")[]
    }
  | { kind: "hr" }
  | { kind: "small"; text: string }

export interface LegalDocContent {
  metadataTitle: string
  metadataDescription: string
  title: string
  subtitle?: string
  blocks: LegalTextBlock[]
}

export interface LegalContentBundle {
  privacy: LegalDocContent
  terms: LegalDocContent
  risks: LegalDocContent
  cookies: LegalDocContent
  consent: LegalDocContent
}

const ru: LegalContentBundle = {
  privacy: {
    metadataTitle: "Политика конфиденциальности | InvestTrack",
    metadataDescription: "Политика обработки персональных данных в соответствии с 152-ФЗ",
    title: "Политика конфиденциальности",
    subtitle: "Последнее обновление: 22 апреля 2026 года",
    blocks: [
      {
        kind: "p",
        text: "Настоящая Политика конфиденциальности определяет порядок обработки персональных данных пользователей сервиса InvestTrack.",
      },
      { kind: "h3", text: "1. Оператор персональных данных" },
      { kind: "p", text: "Оператор: _______________\nИНН: _______________\nEmail: privacy@investtrack.ru" },
      { kind: "h3", text: "2. Состав обрабатываемых данных" },
      { kind: "ul", items: ["ФИО, email, телефон", "Паспортные данные (при верификации)", "Финансовая информация об активах", "Технические данные (IP, cookies)"] },
      { kind: "h3", text: "3. Цели обработки" },
      { kind: "ul", items: ["Регистрация и аутентификация", "Предоставление услуг учёта инвестиций", "Аналитика и отчётность", "Соблюдение законодательства (ПОД/ФТ)"] },
      { kind: "h3", text: "4. Правовое основание" },
      { kind: "p", text: "Обработка осуществляется на основании:" },
      { kind: "ul", items: ["Ст. 6, 9 Федерального закона № 152-ФЗ «О персональных данных»", "Согласия субъекта ПДн", "Договора с субъектом ПДн"] },
      { kind: "h3", text: "5. Сроки хранения" },
      { kind: "p", text: "ПДн хранятся в течение:" },
      { kind: "ul", items: ["Действия договора с пользователем", "5 лет после прекращения договора (налоговые требования)", "3 года для исполнения требований ПОД/ФТ"] },
      { kind: "h3", text: "6. Права субъекта ПДн" },
      { kind: "ul", items: ["Получить информацию об обработке ПДн", "Требовать уточнения, блокировки или уничтожения", "Отозвать согласие на обработку", "Обжаловать действия в Роскомнадзор"] },
      { kind: "h3", text: "7. Защита данных" },
      { kind: "p", text: "Мы применяем следующие меры защиты:" },
      { kind: "ul", items: ["Шифрование данных (TLS/SSL)", "Разграничение доступа", "Резервное копирование", "Регулярные аудиты безопасности"] },
      { kind: "h3", text: "8. Контакты" },
      { kind: "p", text: "По вопросам обработки ПДн:\nEmail: privacy@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "Полный текст Политики конфиденциальности доступен по запросу." },
    ],
  },
  terms: {
    metadataTitle: "Пользовательское соглашение | InvestTrack",
    metadataDescription: "Условия использования сервиса InvestTrack",
    title: "Пользовательское соглашение",
    subtitle: "Действует с: 22 апреля 2026 года",
    blocks: [
      {
        kind: "callout",
        tone: "warning",
        title: "Важно",
        text: "InvestTrack — это информационный сервис для учёта инвестиций. Мы не являемся инвестиционной компанией, брокером или финансовым советником.",
      },
      { kind: "h3", text: "1. Общие положения" },
      {
        kind: "p",
        text: "Настоящее Соглашение регулирует отношения между Оператором сервиса InvestTrack и пользователем. Использование сервиса означает согласие с настоящими условиями.",
      },
      { kind: "h3", text: "2. Предмет соглашения" },
      { kind: "p", text: "Оператор предоставляет пользователю:" },
      { kind: "ul", items: ["Инструменты для учёта инвестиций", "Аналитику портфеля", "Визуализацию данных", "AI-консультанта (информационный характер)"] },
      { kind: "h3", text: "3. Что мы НЕ делаем" },
      { kind: "callout", tone: "danger", text: "Сервис НЕ является:", items: ["Инвестиционной компанией", "Брокером", "Финансовым советником", "Управляющим активами"] },
      { kind: "h3", text: "4. Регистрация" },
      { kind: "p", text: "При регистрации пользователь обязуется:" },
      { kind: "ul", items: ["Предоставить достоверную информацию", "Сохранить конфиденциальность пароля", "Не передавать доступ третьим лицам", "Сообщить о несанкционированном доступе"] },
      { kind: "h3", text: "5. Уведомление о рисках" },
      {
        kind: "callout",
        tone: "danger",
        title: "Инвестиционные риски",
        text: "",
        items: ["Инвестиции сопряжены с риском потери капитала", "Прошлая доходность не гарантирует будущую", "Рыночные данные могут быть неточными", "AI-консультант не даёт гарантий"],
      },
      { kind: "h3", text: "6. Ответственность" },
      { kind: "p", text: "Оператор не несёт ответственности за:" },
      { kind: "ul", items: ["Убытки от инвестиционных решений", "Неточность рыночных данных", "Технические сбои", "Действия третьих лиц"] },
      { kind: "p", text: "Пользователь несёт ответственность за:" },
      { kind: "ul", items: ["Достоверность введённых данных", "Сохранность пароля", "Соблюдение законодательства", "Верность инвестиционных решений"] },
      { kind: "h3", text: "7. Конфиденциальность" },
      {
        kind: "p",
        text: "Обработка персональных данных осуществляется в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и Политикой конфиденциальности.",
      },
      { kind: "h3", text: "8. Изменения и расторжение" },
      { kind: "ul", items: ["Оператор вправе изменять Соглашение без предварительного уведомления", "Пользователь вправе удалить аккаунт в любое время", "При нарушении условий доступ может быть заблокирован"] },
      { kind: "h3", text: "9. Контакты" },
      { kind: "p", text: "Email: support@investtrack.ru\nПо юридическим вопросам: legal@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "Настоящее Соглашение регулируется законодательством Российской Федерации." },
    ],
  },
  risks: {
    metadataTitle: "Уведомление о рисках | InvestTrack",
    metadataDescription: "Важная информация об инвестиционных рисках",
    title: "Уведомление о рисках",
    subtitle: "Внимательно прочитайте перед использованием",
    blocks: [
      { kind: "callout", tone: "warning", text: "InvestTrack — информационный сервис. Мы не даём инвестиционных рекомендаций." },
      { kind: "h3", text: "Инвестиционные риски" },
      {
        kind: "table",
        headers: ["Категория", "Описание"],
        rows: [
          ["Риск потери капитала", "Вы можете потерять часть или все вложенные средства. Инвестиции всегда сопряжены с риском."],
          ["Рыночные риски", "Валютный риск, процентный риск, инфляция, ликвидность."],
          ["Специфические риски", "Волатильность акций, дефолт облигаций, риски криптовалют."],
          ["Технические риски", "Сбои в работе, потеря данных, неточность расчётов."],
        ],
      },
      { kind: "h3", text: "Отказ от ответственности" },
      { kind: "callout", tone: "info", text: "Сервис НЕ предоставляет:", items: ["Инвестиционных рекомендаций", "Финансового консультирования", "Управления активами", "Брокерских услуг"] },
      { kind: "p", text: "Вся информация на сайте носит справочно-образовательный характер." },
      { kind: "h3", text: "Рекомендации по управлению рисками" },
      {
        kind: "ul",
        items: [
          "Диверсификация: не вкладывайте все средства в один актив",
          "Разумный объём: инвестируйте только свободные средства",
          "Образование: изучайте основы инвестирования",
          "Консультации: при необходимости обратитесь к лицензированным специалистам",
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "Используя сервис, вы подтверждаете",
        text: "",
        items: ["Понимание всех описанных рисков", "Готовность понести убытки", "Самостоятельность принятия решений", "Необходимость консультации с профессионалами"],
      },
      { kind: "callout", tone: "danger", text: "Если вы не согласны с рисками — не используйте сервис.\nПри несогласии закройте сайт и удалите аккаунт." },
      { kind: "hr" },
      { kind: "small", text: "Дата обновления: 22 апреля 2026 года" },
    ],
  },
  cookies: {
    metadataTitle: "Политика cookies | InvestTrack",
    metadataDescription: "Информация об использовании cookies",
    title: "Политика использования cookies",
    subtitle: "Последнее обновление: 22 апреля 2026 года",
    blocks: [
      { kind: "h3", text: "Что такое cookies?" },
      {
        kind: "p",
        text: "Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении веб-сайтов. Они позволяют сайту запоминать ваши действия и предпочтения.",
      },
      { kind: "h3", text: "Какие cookies мы используем" },
      {
        kind: "table",
        headers: ["Категория", "Назначение", "Срок"],
        rows: [
          ["Обязательные", "Аутентификация, защита от CSRF", "Сессия / 24 часа"],
          ["Функциональные", "Тема оформления, язык, настройки", "1 год"],
          ["Аналитические", "Статистика использования (Google Analytics)", "2 года"],
        ],
        rowTones: ["danger", "warning", "success"],
      },
      { kind: "h3", text: "Управление cookies" },
      { kind: "p", text: "Вы можете отключить cookies в настройках браузера:" },
      {
        kind: "ul",
        items: [
          "Chrome: Настройки → Конфиденциальность и безопасность → Cookies",
          "Firefox: Настройки → Приватность и защита → Cookies",
          "Safari: Настройки → Конфиденциальность → Cookies",
          "Edge: Настройки → Cookies и разрешения сайтов",
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Важно",
        text: "Отключение обязательных cookies невозможно без нарушения работы сайта. Отключение других типов может ограничить функциональность.",
      },
      { kind: "h3", text: "Безопасность" },
      { kind: "ul", items: ["Cookies не содержат персональных данных в открытом виде", "Используется шифрование HTTPS", "HttpOnly flag защищает от XSS-атак", "Secure flag для HTTPS-only соединений"] },
      { kind: "h3", text: "Сторонние cookies" },
      { kind: "p", text: "Мы не используем сторонние cookies для рекламы, отслеживания на других сайтах или продажи данных маркетологам." },
      { kind: "h3", text: "Контакты" },
      { kind: "p", text: "По вопросам использования cookies:\nEmail: privacy@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "Увидели незнакомый cookie? Напишите нам — мы проверим." },
    ],
  },
  consent: {
    metadataTitle: "Согласие на обработку ПДн | InvestTrack",
    metadataDescription: "Форма согласия на обработку персональных данных",
    title: "Согласие на обработку персональных данных",
    subtitle: "Федеральный закон № 152-ФЗ",
    blocks: [
      {
        kind: "callout",
        tone: "info",
        text: "Я, субъект персональных данных, даю свое добровольное, осознанное и информированное согласие на обработку моих персональных данных Оператору сервиса InvestTrack.\nДата выдачи согласия: при регистрации в сервисе",
      },
      { kind: "h3", text: "Состав персональных данных" },
      { kind: "h4", text: "Основные данные" },
      { kind: "ul", items: ["ФИО", "Email, телефон", "Адрес регистрации", "Дата рождения"] },
      { kind: "h4", text: "Финансовая информация" },
      { kind: "ul", items: ["Данные об активах", "История транзакций", "Размеры инвестиций", "Инвестиционные цели"] },
      { kind: "h3", text: "Цели и сроки обработки" },
      {
        kind: "table",
        headers: ["Цель", "Срок"],
        rows: [
          ["Регистрация и аутентификация", "Весь период использования"],
          ["Предоставление услуг", "Весь период использования"],
          ["Соблюдение ПОД/ФТ", "5 лет"],
          ["Налоговая отчётность", "5 лет"],
        ],
      },
      { kind: "h3", text: "Передача третьим лицам" },
      { kind: "p", text: "Согласие предоставляется на передачу данных:" },
      { kind: "ul", items: ["Обработчикам: хостинг, email-рассылки, аналитика", "Государственным органам: по запросу в установленном порядке", "Трансграничная передача: не осуществляется"] },
      { kind: "h3", text: "Права субъекта ПДн" },
      { kind: "ul", items: ["Получить информацию об обработке", "Требовать уточнения данных", "Требовать удаления данных", "Отозвать согласие"] },
      { kind: "callout", tone: "warning", title: "Как отозвать", text: "Через личный кабинет или по email: privacy@investtrack.ru\nВнимание: отзыв приводит к удалению аккаунта." },
      { kind: "h3", text: "Подтверждение" },
      { kind: "ul", items: ["Ознакомлен с Политикой конфиденциальности", "Понимаю цели и условия обработки ПДн", "Даю согласие добровольно и осознанно", "Известны мои права как субъекта ПДн"] },
      { kind: "callout", tone: "success", title: "Контакты для вопросов", text: "Email: privacy@investtrack.ru\nФорма обратной связи: в личном кабинете" },
      { kind: "hr" },
      { kind: "small", text: "Согласие действует до достижения целей обработки, отзыва согласия или истечения установленных законом сроков." },
    ],
  },
}

const en: LegalContentBundle = {
  privacy: {
    metadataTitle: "Privacy Policy | InvestTrack",
    metadataDescription: "Personal data processing policy (Federal Law 152-FZ)",
    title: "Privacy Policy",
    subtitle: "Last updated: April 22, 2026",
    blocks: [
      { kind: "p", text: "This Privacy Policy defines how InvestTrack processes users’ personal data." },
      { kind: "h3", text: "1. Data controller" },
      { kind: "p", text: "Controller: _______________\nTax ID: _______________\nEmail: privacy@investtrack.ru" },
      { kind: "h3", text: "2. Categories of data processed" },
      { kind: "ul", items: ["Full name, email, phone", "Passport details (if verification is required)", "Financial information about assets", "Technical data (IP, cookies)"] },
      { kind: "h3", text: "3. Purposes of processing" },
      { kind: "ul", items: ["Registration and authentication", "Providing investment tracking services", "Analytics and reporting", "Legal compliance (AML/CFT)"] },
      { kind: "h3", text: "4. Legal basis" },
      { kind: "p", text: "We process personal data based on:" },
      { kind: "ul", items: ["Articles 6 and 9 of Federal Law No. 152-FZ “On Personal Data”", "Data subject consent", "Contract with the data subject"] },
      { kind: "h3", text: "5. Retention periods" },
      { kind: "p", text: "Personal data is stored for:" },
      { kind: "ul", items: ["The term of the user agreement", "5 years after termination (tax requirements)", "3 years to comply with AML/CFT requirements"] },
      { kind: "h3", text: "6. Data subject rights" },
      { kind: "ul", items: ["Request information about processing", "Request correction, restriction, or deletion", "Withdraw consent", "File a complaint with the regulator"] },
      { kind: "h3", text: "7. Security measures" },
      { kind: "p", text: "We apply the following measures:" },
      { kind: "ul", items: ["Encryption (TLS/SSL)", "Access control", "Backups", "Regular security reviews"] },
      { kind: "h3", text: "8. Contacts" },
      { kind: "p", text: "For personal data inquiries:\nEmail: privacy@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "The full text of this Privacy Policy is available upon request." },
    ],
  },
  terms: {
    metadataTitle: "Terms of Service | InvestTrack",
    metadataDescription: "Terms for using InvestTrack",
    title: "Terms of Service",
    subtitle: "Effective date: April 22, 2026",
    blocks: [
      {
        kind: "callout",
        tone: "warning",
        title: "Important",
        text: "InvestTrack is an informational service for tracking investments. We are not an investment company, broker, or financial advisor.",
      },
      { kind: "h3", text: "1. General provisions" },
      {
        kind: "p",
        text: "These Terms govern the relationship between the InvestTrack service operator and the user. Using the service means you accept these Terms.",
      },
      { kind: "h3", text: "2. Scope of service" },
      { kind: "p", text: "The operator provides:" },
      { kind: "ul", items: ["Tools for investment tracking", "Portfolio analytics", "Data visualization", "AI assistant (informational purpose)"] },
      { kind: "h3", text: "3. What we do NOT do" },
      { kind: "callout", tone: "danger", text: "The service is NOT:", items: ["An investment company", "A broker", "A financial advisor", "An asset manager"] },
      { kind: "h3", text: "4. Registration" },
      { kind: "p", text: "By registering, the user agrees to:" },
      { kind: "ul", items: ["Provide accurate information", "Keep the password confidential", "Not share access with third parties", "Report unauthorized access"] },
      { kind: "h3", text: "5. Risk disclosure" },
      {
        kind: "callout",
        tone: "danger",
        title: "Investment risks",
        text: "",
        items: ["Investing involves risk of capital loss", "Past performance does not guarantee future results", "Market data may be inaccurate", "The AI assistant provides no guarantees"],
      },
      { kind: "h3", text: "6. Liability" },
      { kind: "p", text: "The operator is not liable for:" },
      { kind: "ul", items: ["Losses from investment decisions", "Inaccurate market data", "Technical failures", "Actions of third parties"] },
      { kind: "p", text: "The user is responsible for:" },
      { kind: "ul", items: ["Accuracy of provided data", "Password security", "Legal compliance", "Their investment decisions"] },
      { kind: "h3", text: "7. Privacy" },
      { kind: "p", text: "Personal data is processed under Federal Law No. 152-FZ and the Privacy Policy." },
      { kind: "h3", text: "8. Changes and termination" },
      { kind: "ul", items: ["We may update these Terms without prior notice", "The user may delete their account at any time", "Access may be blocked for violations"] },
      { kind: "h3", text: "9. Contacts" },
      { kind: "p", text: "Email: support@investtrack.ru\nLegal: legal@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "These Terms are governed by the laws of the Russian Federation." },
    ],
  },
  risks: {
    metadataTitle: "Risk Disclosure | InvestTrack",
    metadataDescription: "Important information about investment risks",
    title: "Risk Disclosure",
    subtitle: "Please read carefully before use",
    blocks: [
      { kind: "callout", tone: "warning", text: "InvestTrack is an informational service. We do not provide investment recommendations." },
      { kind: "h3", text: "Investment risks" },
      {
        kind: "table",
        headers: ["Category", "Description"],
        rows: [
          ["Risk of capital loss", "You may lose part or all of your invested funds. Investing always involves risk."],
          ["Market risks", "FX risk, interest-rate risk, inflation, liquidity."],
          ["Specific risks", "Equity volatility, bond default, crypto risks."],
          ["Technical risks", "Service outages, data loss, calculation errors."],
        ],
      },
      { kind: "h3", text: "Disclaimer" },
      { kind: "callout", tone: "info", text: "The service does NOT provide:", items: ["Investment recommendations", "Financial advisory services", "Asset management", "Brokerage services"] },
      { kind: "p", text: "All information on the website is for educational and reference purposes only." },
      { kind: "h3", text: "Risk management tips" },
      {
        kind: "ul",
        items: [
          "Diversification: do not allocate all funds to a single asset",
          "Appropriate sizing: invest only funds you can afford to risk",
          "Education: learn investing fundamentals",
          "Consultation: contact licensed professionals when needed",
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "By using the service, you confirm",
        text: "",
        items: ["You understand the described risks", "You are ready to incur losses", "You make decisions independently", "You may need professional advice"],
      },
      { kind: "callout", tone: "danger", text: "If you do not accept these risks — do not use the service.\nIf you disagree, close the website and delete your account." },
      { kind: "hr" },
      { kind: "small", text: "Updated: April 22, 2026" },
    ],
  },
  cookies: {
    metadataTitle: "Cookies Policy | InvestTrack",
    metadataDescription: "Information about cookies usage",
    title: "Cookies Policy",
    subtitle: "Last updated: April 22, 2026",
    blocks: [
      { kind: "h3", text: "What are cookies?" },
      { kind: "p", text: "Cookies are small text files stored on your device when you visit websites. They help the site remember your actions and preferences." },
      { kind: "h3", text: "What cookies we use" },
      {
        kind: "table",
        headers: ["Category", "Purpose", "Duration"],
        rows: [
          ["Essential", "Authentication, CSRF protection", "Session / 24 hours"],
          ["Functional", "Theme, language, settings", "1 year"],
          ["Analytics", "Usage statistics (Google Analytics)", "2 years"],
        ],
        rowTones: ["danger", "warning", "success"],
      },
      { kind: "h3", text: "Managing cookies" },
      { kind: "p", text: "You can disable cookies in your browser settings:" },
      {
        kind: "ul",
        items: ["Chrome: Settings → Privacy and security → Cookies", "Firefox: Settings → Privacy & Security → Cookies", "Safari: Settings → Privacy → Cookies", "Edge: Settings → Cookies and site permissions"],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Important",
        text: "Disabling essential cookies may break the website. Disabling other categories may reduce functionality.",
      },
      { kind: "h3", text: "Security" },
      { kind: "ul", items: ["Cookies do not contain plain personal data", "HTTPS encryption is used", "HttpOnly helps protect from XSS", "Secure flag is used for HTTPS-only connections"] },
      { kind: "h3", text: "Third-party cookies" },
      { kind: "p", text: "We do not use third-party cookies for advertising, cross-site tracking, or selling data to marketers." },
      { kind: "h3", text: "Contacts" },
      { kind: "p", text: "For cookies questions:\nEmail: privacy@investtrack.ru" },
      { kind: "hr" },
      { kind: "small", text: "See an unfamiliar cookie? Contact us — we’ll investigate." },
    ],
  },
  consent: {
    metadataTitle: "Personal Data Consent | InvestTrack",
    metadataDescription: "Consent form for personal data processing",
    title: "Consent to Personal Data Processing",
    subtitle: "Federal Law No. 152-FZ",
    blocks: [
      {
        kind: "callout",
        tone: "info",
        text: "I, as the data subject, provide my voluntary, informed consent for InvestTrack to process my personal data.\nConsent date: upon registration in the service.",
      },
      { kind: "h3", text: "Categories of personal data" },
      { kind: "h4", text: "Basic data" },
      { kind: "ul", items: ["Full name", "Email, phone", "Registration address", "Date of birth"] },
      { kind: "h4", text: "Financial information" },
      { kind: "ul", items: ["Asset data", "Transaction history", "Investment amounts", "Investment goals"] },
      { kind: "h3", text: "Purposes and retention" },
      {
        kind: "table",
        headers: ["Purpose", "Term"],
        rows: [
          ["Registration and authentication", "For the entire period of use"],
          ["Service provision", "For the entire period of use"],
          ["AML/CFT compliance", "5 years"],
          ["Tax reporting", "5 years"],
        ],
      },
      { kind: "h3", text: "Sharing with third parties" },
      { kind: "p", text: "Consent includes sharing data with:" },
      { kind: "ul", items: ["Processors: hosting, email delivery, analytics", "Authorities: upon lawful request", "Cross-border transfer: not performed"] },
      { kind: "h3", text: "Data subject rights" },
      { kind: "ul", items: ["Request information about processing", "Request correction", "Request deletion", "Withdraw consent"] },
      { kind: "callout", tone: "warning", title: "How to withdraw", text: "Via your account settings or by email: privacy@investtrack.ru\nNote: withdrawal results in account deletion." },
      { kind: "h3", text: "Confirmation" },
      { kind: "ul", items: ["I have read the Privacy Policy", "I understand the purposes and conditions of processing", "I provide consent voluntarily", "I am aware of my rights"] },
      { kind: "callout", tone: "success", title: "Contacts", text: "Email: privacy@investtrack.ru\nFeedback form: in your account" },
      { kind: "hr" },
      { kind: "small", text: "Consent remains valid until processing purposes are achieved, consent is withdrawn, or statutory terms expire." },
    ],
  },
}

export function getLegalContent(locale: Locale): LegalContentBundle {
  return locale === "en" ? en : ru
}

