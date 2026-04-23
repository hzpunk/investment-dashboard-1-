"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Scale } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { getLegalContent } from "@/lib/legal-content"

export default function ConsentPage() {
  const { locale } = useI18n()
  const content = getLegalContent(locale).consent

  const confirmationItems = content.blocks.find((block) => block.kind === "ul" && block.items.length === 4)
  const confirmationList = confirmationItems?.kind === "ul" ? confirmationItems.items : []

  return (
    <Card>
      <CardHeader className="bg-blue-50">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-blue-600" />
          <div>
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            {content.subtitle ? <p className="text-sm text-blue-600 mt-1">{content.subtitle}</p> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none pt-6">
        {content.blocks.map((block, idx) => {
          if (block.kind === "p") return <p key={idx} style={{ whiteSpace: "pre-line" }}>{block.text}</p>
          if (block.kind === "h3") return <h3 key={idx}>{block.text}</h3>
          if (block.kind === "h4") return <h4 key={idx}>{block.text}</h4>
          if (block.kind === "ul") {
            // Confirmation is rendered as disabled checkboxes below.
            if (block.items.length === 4 && confirmationList.length === 4) return null
            return (
              <ul key={idx}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          }
          if (block.kind === "callout") {
            const className =
              block.tone === "danger"
                ? "bg-red-50 border border-red-200 rounded p-4 not-prose mb-6"
                : block.tone === "warning"
                  ? "bg-yellow-50 border-l-4 border-yellow-400 p-4 not-prose mb-6"
                  : block.tone === "success"
                    ? "bg-blue-100 border-2 border-blue-400 rounded-lg p-6 not-prose mt-8"
                    : "bg-gray-100 p-4 rounded-lg not-prose mb-6"
            return (
              <div key={idx} className={className}>
                {block.title ? <h4 className="font-semibold mb-2">{block.title}</h4> : null}
                <p className="text-sm mb-0" style={{ whiteSpace: "pre-line" }}>
                  {block.text}
                </p>
                {block.items?.length ? (
                  <ul className="text-sm mb-0">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          }
          if (block.kind === "table") {
            return (
              <div key={idx} className="overflow-x-auto not-prose">
                <table className="min-w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {block.headers.map((h) => (
                        <th key={h} className="border border-gray-200 px-4 py-2 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-gray-200 px-4 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          if (block.kind === "hr") return <hr key={idx} className="my-6" />
          if (block.kind === "small") return <p key={idx} className="text-sm text-gray-500">{block.text}</p>
          return null
        })}

        {confirmationList.length ? (
          <>
            <h3>{content.blocks.find((b) => b.kind === "h3" && b.text.toLowerCase().includes("подтверж"))?.text ?? "Confirmation"}</h3>
            <div className="space-y-3 not-prose">
              {confirmationList.map((label, i) => {
                const id = `confirm-${i + 1}`
                return (
                  <div key={id} className="flex items-start gap-3">
                    <Checkbox id={id} disabled checked />
                    <Label htmlFor={id} className="text-sm text-gray-700">
                      {label}
                    </Label>
                  </div>
                )
              })}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
