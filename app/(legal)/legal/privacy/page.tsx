"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/contexts/i18n-context"
import { getLegalContent } from "@/lib/legal-content"

export default function PrivacyPage() {
  const { locale } = useI18n()
  const content = getLegalContent(locale).privacy

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        {content.subtitle ? <p className="text-sm text-gray-500">{content.subtitle}</p> : null}
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        {content.blocks.map((block, idx) => {
          if (block.kind === "p") {
            return (
              <p key={idx} style={{ whiteSpace: "pre-line" }}>
                {block.text}
              </p>
            )
          }
          if (block.kind === "h3") return <h3 key={idx}>{block.text}</h3>
          if (block.kind === "h4") return <h4 key={idx}>{block.text}</h4>
          if (block.kind === "ul") {
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
                ? "bg-red-50 border-l-4 border-red-400 p-4"
                : block.tone === "warning"
                  ? "bg-yellow-50 border-l-4 border-yellow-400 p-4"
                  : block.tone === "success"
                    ? "bg-green-50 border-l-4 border-green-400 p-4"
                    : "bg-blue-50 border-l-4 border-blue-400 p-4"
            return (
              <div key={idx} className={className}>
                {block.title ? <p className="font-medium mb-1">{block.title}</p> : null}
                {block.text ? (
                  <p className="text-sm" style={{ whiteSpace: "pre-line" }}>
                    {block.text}
                  </p>
                ) : null}
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
      </CardContent>
    </Card>
  )
}
