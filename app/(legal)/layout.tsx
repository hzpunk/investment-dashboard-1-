export const metadata = {
  title: "Правовая информация",
  description: "Политика конфиденциальности, пользовательское соглашение и уведомление о рисках",
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
