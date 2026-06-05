import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import { buildExportFile, safeFilename } from "@/lib/export/formatters"
import { dataUrlToBytes } from "@/lib/export/qr-code"
import { tableSections } from "@/lib/export/generators/tabular"

export async function generateDocxExport(bundle: ExportDataBundle): Promise<ExportFile> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      text: bundle.metadata.title,
      heading: HeadingLevel.TITLE,
    }),
  ]

  if (bundle.metadata.subtitle) {
    children.push(new Paragraph({ text: bundle.metadata.subtitle }))
  }

  children.push(
    new Paragraph({ text: `Generated: ${bundle.metadata.generatedAtFormatted}` }),
    new Paragraph({ text: `Period: ${bundle.metadata.period.label}` }),
    new Paragraph({ text: `User: ${bundle.user.email}` }),
  )

  if (bundle.metadata.appUrl) {
    children.push(new Paragraph({ text: `Application: ${bundle.metadata.appUrl}` }))
  }

  const qrBytes = dataUrlToBytes(bundle.qrCodeDataUrl)
  if (qrBytes) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: Buffer.from(qrBytes),
            transformation: { width: 96, height: 96 },
            type: "png",
          }),
        ],
      }),
    )
  }

  for (const section of tableSections(bundle)) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }))
    if (section.kind === "summary" && section.summaryItems) {
      children.push(...section.summaryItems.map((item) => new Paragraph({ children: [new TextRun({ text: `${item.label}: `, bold: true }), new TextRun(item.value)] })))
    } else {
      children.push(buildDocxTable(section.rows.slice(0, bundle.metadata.selectedSections.length > 5 ? 80 : 200)))
    }
    if (section.rows.length > 200) {
      children.push(new Paragraph({ text: `Table was limited to 200 rows in DOCX. Use XLSX/JSON for the full dataset.` }))
    }
  }

  if (
    (bundle.metadata.selectedSections.includes("allocationChart") && (bundle.allocationChart?.byAsset.length ?? 0) > 0) ||
    (bundle.metadata.selectedSections.includes("performanceChart") && (bundle.performanceChart?.points.length ?? 0) > 0)
  ) {
    children.push(new Paragraph({ text: "Charts are exported as source data tables in DOCX." }))
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Disclaimer: Calculations are approximate and are not investment, financial, or tax advice.",
          italics: true,
        }),
      ],
    }),
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: bundle.metadata.orientation,
            },
          },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buildExportFile(
    safeFilename(bundle.metadata.title, "docx"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    Uint8Array.from(buffer),
  )
}

function buildDocxTable(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [cell("No data", true)] })],
    })
  }

  const headers = Object.keys(rows[0]).slice(0, 6)
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((header) => cell(header, true)) }),
      ...rows.map((row) => new TableRow({ children: headers.map((header) => cell(String(row[header] ?? ""), false)) })),
    ],
  })
}

function cell(text: string, bold: boolean) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text: text.slice(0, 300), bold })],
      }),
    ],
  })
}
