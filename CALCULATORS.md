# Calculators

The `/calculators` dashboard page provides localized client-side calculators powered by pure functions from `lib/finance/calculators.ts`, `lib/finance/projections.ts` and `lib/finance/calculations.ts`.

## Categories

- Investments: compound interest, future value with monthly contributions, goal contribution, CAGR, average purchase price, profit/loss, dividend income, portfolio rebalancing.
- Assets: position value, average after purchase, break-even price, allocation percentage, risk per trade / position size.
- Business: VAT/НДС add and extract, margin and markup, revenue/profit, break-even point, ROI, payback period.
- Loans and mortgage: mortgage monthly payment, loan overpayment, annuity payment, differentiated payment.
- Taxes: income tax estimate, investment profit tax estimate, VAT extraction.

## Key Formulas

```text
Future Value = P * (1 + r / 12)^n
```

```text
Future Value with Contributions =
  P * (1 + i)^n + PMT * ((1 + i)^n - 1) / i
```

```text
Annuity Payment =
  P * i * (1 + i)^n / ((1 + i)^n - 1)
```

```text
VAT Add = amount * rate
VAT Extract = amount - amount / (1 + rate)
```

```text
Break-even Units = fixedCosts / (pricePerUnit - variableCostPerUnit)
```

## Behavior

- Calculators are local/client-side and do not store results in the database.
- Inputs are guarded against invalid and negative values.
- Each calculator has localized title, description, labels, result rows and formula text.
- Results are reference estimates only and are not financial, investment or tax advice.

