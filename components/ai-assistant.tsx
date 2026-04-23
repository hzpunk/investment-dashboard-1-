"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send, Sparkles, User } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

export function AIAssistant() {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: t("ai.hello"), timestamp: new Date() }])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ role: "assistant", content: t("ai.hello"), timestamp: new Date() }]
      }

      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ ...prev[0], content: t("ai.hello") }]
      }

      return prev
    })
  }, [t])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages.map((m) => ({ role: m.role, content: m.content })) }),
      })

      if (!response.ok) {
        throw new Error("failed_to_get_response")
      }

      const data = await response.json()
      const assistantMessage: Message = { role: "assistant", content: data.response, timestamp: new Date() }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = { role: "assistant", content: t("ai.error"), timestamp: new Date() }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        aria-label={t("ai.open")}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg hover:from-purple-700 hover:to-blue-700"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 h-[500px] w-96 border-0 bg-white/95 shadow-2xl backdrop-blur">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-sm font-semibold">{t("ai.title")}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label={t("ai.close")} className="h-8 w-8 p-0 text-white hover:bg-white/20">
            ×
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex h-[calc(100%-60px)] flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "user" ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-purple-500 to-purple-600"}`}>
                  {message.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"}`}>{message.content}</div>
              </div>
            ))}
            {isLoading ? (
              <div className="flex gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-purple-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-lg bg-gray-100 px-3 py-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="border-t bg-white p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("ai.placeholder")}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-400">{t("ai.disclaimer")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
