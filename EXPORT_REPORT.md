# Модуль выгрузки данных

## Назначение

Модуль `Выгрузка данных` добавляет в InvestTrack сценарий подготовки отчётов и файлов выгрузки: выбор формата, выбор разделов, период, настройки документа, сводку содержимого выгрузки, печать и скачивание файла.

## Обновление стабилизации 2026-06-04

- `/api/export` валидирует запрос до генерации файла и возвращает безопасный JSON `{ ok:false, error }` для обычных ошибок пользователя.
- Точный визуальный preview заменён на стабильную сводку `Что будет выгружено`: формат, период, выбранные разделы, оценка записей, параметры и предупреждения.
- `POST /api/export/summary` возвращает JSON-сводку и не генерирует PDF/DOCX/XLSX.
- Генерация файла выполняется только по нажатию `Скачать`.
- PDF размещает QR-код в отдельном блоке `Application link` с размером 72 px, отступом 24 px и зарезервированной footer-зоной 90 px.

## Реализованные форматы

Полностью рабочие форматы:

- PDF: документ A4 с заголовком, метаданными, таблицами, ссылкой на приложение, QR-кодом и проверкой макета.
- DOCX: структурированный Word-документ с заголовками, таблицами, ссылкой и QR-кодом.
- CSV: единый многораздельный CSV с разделителем `;`.
- XLSX: книга с листами `Summary`, `Accounts`, `Assets`, `Holdings`, `Transactions`, `Analytics`.
- TXT: человекочитаемый текстовый отчёт.
- JSON: структурированная выгрузка безопасных пользовательских данных.

Запланированный и отключённый формат: HTML. Для него UI показывает статус “Этот формат будет добавлен позже”, а API возвращает `EXPORT_FORMAT_NOT_IMPLEMENTED` со статусом 422.

## Архитектура

- `lib/export/types.ts` — DTO, список форматов, секции и опции.
- `lib/export/collect-export-data.ts` — серверный сборщик данных из Prisma.
- `lib/export/formatters.ts` — валидация запроса, CSV/TXT helpers, safe filename, secret stripping.
- `lib/export/app-link.ts` — вычисление публичной ссылки приложения.
- `lib/export/qr-code.ts` — генерация QR в PNG data URL и SVG.
- `lib/export/layout-validator.ts` — проверка PDF-блоков на выход за границы и наложения.
- `lib/export/generators/*` — генераторы PDF, DOCX, CSV/XLSX/XLS/ODS/TXT/JSON/XML/QIF/OFX/MT940/CAMT.053.

API:

- `POST /api/export/summary` — возвращает `{ ok: true, data: { summary } }` без генерации файла.
- `POST /api/export/preview` — совместимый endpoint, возвращает такую же summary-структуру.
- `POST /api/export` — возвращает бинарный или текстовый файл с `Content-Type` и `Content-Disposition`.
- `GET /api/export` — сохранён как совместимость для старых CSV/JSON ссылок.

## Безопасность

Сборщик экспортирует только пользовательские данные: безопасные поля пользователя, счета, связанные активы, позиции, транзакции, аналитику и admin-only audit summary только для администратора.

Не экспортируются пароли, токены, cookie, session data, API keys, `DATABASE_URL`, auth secrets и внутренние connection strings. Файлы формируются на demand и не сохраняются постоянно.

## App Link и QR

Публичная ссылка определяется в таком порядке:

1. `APP_PUBLIC_URL`;
2. `NEXT_PUBLIC_APP_URL`;
3. `x-forwarded-proto` + `x-forwarded-host`;
4. `host`;
5. `http://localhost:3000`.

QR-код создаётся через `qrcode` как PNG data URL и SVG. PDF и DOCX встраивают PNG; summary-preview не генерирует и не встраивает QR, чтобы не запускать тяжёлую генерацию при изменении формы.

## PDF Layout

PDF использует A4 portrait по умолчанию и landscape по опции. Генератор ведёт cursor-based layout, добавляет страницы при нехватке места, ограничивает таблицы в PDF и прогоняет итоговые блоки через `validateLayout()`.

Проверяются отрицательные координаты, выход за пределы страницы, пересечение блоков, collision с footer и collision с QR-кодом.

## Графики

Summary-preview не строит визуальные графики. Для серверных PDF/DOCX экспортов chart snapshots опциональны. Если snapshot не передан, данные графиков экспортируются как таблицы, а документ добавляет пояснение: “Chart image is unavailable for export; data is provided as tables.”

## Ограничения

- QIF, OFX, MT940 и CAMT.053 реализованы как упрощённые финансовые форматы для переносимости данных, отчётности и демонстрации.
- Эти финансовые форматы не являются сертифицированными банковскими выписками; внешние системы могут требовать более строгие банковские варианты.
- PDF ограничивает количество строк в широких таблицах; полный набор данных доступен в XLSX/JSON.
- Калькуляторы и AI-сводки пока не сохраняются в БД, поэтому экспортируют только явную пометку.

Расчёты и отчёты являются справочными и не являются финансовой, инвестиционной или налоговой рекомендацией.
## 2026-06-05 Export stabilization update

- PDF now embeds local Noto Sans TTF fonts from `assets/fonts/NotoSans-Regular.ttf` and `assets/fonts/NotoSans-Bold.ttf`; the generator no longer falls back to core PDF fonts for Cyrillic text.
- If font loading or embedding fails, `/api/export` returns a controlled `EXPORT_FONT_FAILED` JSON error.
- PDF QR placement was moved to a dedicated "Application link" section with a reserved 72 px QR block and layout validation.
- The export page no longer exposes browser printing. Users download PDF/DOCX for document output.
- The preview area is a stable export contents summary. It shows format, period, sections, record estimates, options, warnings, and readiness, but it is not an exact PDF/DOCX/XLSX visual preview.
- Section rows in the summary are interactive and show included fields, record count, sample rows, empty states, and chart/export notes.
- Dates are formatted through `lib/format/date.ts`: RU `DD.MM.YYYY`, EN `MM.DD.YYYY`, with `HH:mm` for date-time labels.
- `lib/export/charts/svg-charts.ts` generates simple allocation and performance SVG charts from data. PDF renders simple chart primitives from the same data; DOCX keeps chart data tables with a precise note.
- CSV/XLSX/JSON/TXT export chart source data and do not show visual chart warnings by default.
- JSON export is compact by default. Projection point arrays and extended details are included only when `detailedMode` is enabled.
- New error codes documented and localized: `EXPORT_FONT_FAILED`, `EXPORT_CHART_RENDER_FAILED`.

## 2026-06-05 Presentation and Privacy Update

- Export generators no longer receive raw Prisma/API DTO rows directly. The pipeline is now:
  `collectExportData()` -> `sanitizeExportData()` -> `mapToExportViewModel()` -> PDF/DOCX/CSV/XLSX/TXT/JSON generators.
- `lib/export/presentation/labels.ts` centralizes localized section and field labels. Reports use names such as `Сводка портфеля`, `Стоимость портфеля`, `Счета`, `Позиции`, `Распределение активов` instead of `portfolioSummary`, `totalPortfolioValue`, `createdAt`, or `currentPrice`.
- `lib/export/presentation/enums.ts` localizes user-facing enum values such as `brokerage` -> `Брокерский счёт`, `stock` -> `Акция`, and `buy` -> `Покупка`.
- `lib/export/presentation/format-values.ts` formats money, percentages, numbers, and dates for RU/EN output.
- User-facing exports remove internal identifiers and keys (`id`, `key`, `assetId`, `portfolioId`, `accountId`, `userId`) from PDF/DOCX/TXT/CSV/XLSX rows.
- The default JSON export is compact and public-facing. It uses stable public keys such as `portfolio.summary.portfolioValue`, `investedAmount`, `profitLoss`, and `analytics.allocation`; it does not include QR base64/SVG, chart snapshots, raw section keys, or full projection point arrays by default.
- A technical export audience option was added for advanced/developer use. User mode remains the default and is the only mode intended for investor-facing reports.
- XLSX sheet names and CSV headers are localized (`Сводка портфеля`, `Счета`, `Название`, `Тип`, `Баланс`) rather than internal DTO names.
- The export summary/details UI now uses the same user-facing labels for section names and included fields.

## 2026-06-05 CSV/XLS/ODS/XML Update

- CSV now starts with a UTF-8 BOM (`\uFEFF`) so Microsoft Excel on Windows detects Russian text correctly instead of opening UTF-8 as ANSI/Windows-1251.
- CSV keeps the semicolon delimiter (`;`) for RU/European Excel compatibility and uses the shared CSV escaping rules: values with delimiters, quotes, or line breaks are quoted; quotes are escaped by doubling.
- CSV cell values normalize non-breaking spaces (`\u00A0`, `\u202F`) to regular spaces to avoid artifacts such as `21В 588,75В $` in legacy import paths.
- XLS is now implemented through the `xlsx` package with `bookType: "biff8"` and `application/vnd.ms-excel`. It is a true legacy workbook export, not a renamed CSV.
- ODS is now implemented through the `xlsx` package with `bookType: "ods"` and `application/vnd.oasis.opendocument.spreadsheet`.
- XML is now implemented as a clean public XML report (`<investmentReport version="1.0">`) with stable tag names, escaped XML values, localized enum text, and no QR base64/SVG or internal database IDs.
- Format availability is centralized in `lib/export/formats.ts`. Implemented formats are PDF, DOCX, TXT, CSV, XLSX, XLS, ODS, JSON, XML, QIF, OFX, MT940, CAMT.053. Planned/disabled format: HTML.

## 2026-06-05 Financial Formats Update

Implemented financial transaction formats:

- QIF (`application/qif; charset=utf-8`, `.qif`): personal finance import format. Exports investment transactions as `!Type:Invst` and cash/account transactions as `!Type:Bank`; maps buy/sell/dividend/interest/deposit/withdrawal/fee to QIF actions.
- OFX (`application/x-ofx; charset=utf-8`, `.ofx`): OFX 2.x XML-style statement export with `<OFX>`, signon status, account metadata, and `<STMTTRN>` transaction entries.
- MT940 (`text/plain; charset=utf-8`, `.sta`): simplified SWIFT statement-like text export with tags `:20:`, `:25:`, `:60F:`, `:61:`, `:86:`, `:62F:`.
- CAMT.053 (`application/xml; charset=utf-8`, `.xml`): simplified ISO 20022 CAMT.053 XML statement with namespace `urn:iso:std:iso:20022:tech:xsd:camt.053.001.02`, `<BkToCstmrStmt>`, and `<Ntry>` entries.

Financial generators use `mapToFinancialExportModel()` and only include safe account/transaction data. FITID, EndToEndId, MT940 references, and message IDs are generated from hashes of safe transaction fields and do not expose database IDs.

For financial formats, supported sections are accounts, transactions, and metadata. Visual/report sections such as analytics, allocation charts, performance charts, calculator results, and AI summaries are ignored with the `FINANCIAL_SECTIONS_ONLY` summary warning rather than causing export failure.

Limitations: these exports are intended for portability, reporting, and demo use. They are not certified bank statements. External finance systems may require stricter bank-specific variants, institution IDs, account numbers, balances, or schema versions.

## 2026-06-06 Account Scope and RUB Update

The export module now respects the global selected account scope. The export page includes an account selector and sends the scope in the export request:

```json
{
  "accountScope": { "type": "single", "accountId": "acc_123" }
}
```

`collectExportData()` resolves the requested scope on the server and filters accounts, transactions and account-derived holdings to the authenticated user's account. `all` scope exports all user accounts. Invalid account IDs return a controlled `ACCOUNT_NOT_FOUND` API error.

Report metadata now includes:

- selected account name or all-accounts scope;
- account currency for a single account;
- report base currency;
- CBR rate source/date when currency conversion was used;
- conversion warnings when rates are stale, partial or unavailable.

PDF/DOCX/TXT/CSV/XLSX/JSON/XML exports use the same user-facing presentation layer for account metadata. Financial formats continue to focus on account and transaction sections and ignore visual sections with a warning.

RUB is supported as a primary export currency. For Russian report language, RUB is the default report currency. All-account analytics/export values use CBR reference rates when conversion is needed:

```text
rubPerUnit = value / nominal
foreignToRub = amount * rubPerUnit
rubToForeign = amount / rubPerUnit
```

Limitations:

- Historical holdings are account-scoped through transactions. Legacy `PortfolioAsset` rows are not account-linked in the current schema, so single-account holdings do not use those rows directly.
- CBR reference rates may differ from actual broker or bank execution rates.
- If CBR and cached rates are unavailable, converted aggregate values are marked partial/unavailable instead of using fake rates.

## 2026-06-06 Display Currency Update

The export page now follows the global display currency preference. `options.currency` defaults to the selected display currency, and changing the top-bar switcher updates the export form unless the user overrides it.

Reports include display-currency metadata:

- display/report currency;
- selected account scope;
- CBR source/date when conversion was used;
- conversion warnings for stale, partial or unavailable rates.

New option:

```json
{
  "options": {
    "includeCbrRates": true
  }
}
```

When enabled, generated reports include the CBR exchange-rate metadata used for conversion. CBR rates are informational reference rates, not broker or bank execution rates.

Account rows in user-facing exports now separate native and display values:

- balance in account currency;
- account currency;
- balance in display currency;
- display currency;
- conversion status;
- rate source/date when conversion succeeds.

The export presentation layer must not render `21 588.75 RUB` for an original `21 588.75 USD` balance. If the CBR rate is unavailable, the display balance is left empty/null and the report metadata includes a conversion warning.
