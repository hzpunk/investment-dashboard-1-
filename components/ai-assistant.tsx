"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Bot, Database, Loader2, Send, Sparkles, User, X } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ContextStatusValue = "available" | "partial" | "empty" | "unavailable"

type ContextStatus = {
  portfolio?: ContextStatusValue
  accounts?: ContextStatusValue
  marketData?: ContextStatusValue
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "normal" | "error"
  contextStatus?: ContextStatus
}

const quickPrompts = [
  "Проанализируй мой портфель",
  "Какие активы самые рискованные?",
  "Дай краткую сводку по доходности",
  "Что можно улучшить в диверсификации?",
  "Сколько сейчас на моём счету?",
  "Какой сейчас курс биткоина?",
]

const friendlyError = "AI-ассистент временно недоступен. Проверьте подключение к локальной модели."

function getContextLabels(status?: ContextStatus) {
  if (!status) return []

  const labels: string[] = []

  if (status.portfolio === "available") {
    labels.push("Учтены данные портфеля")
  } else if (status.portfolio === "empty") {
    labels.push("Данных портфеля пока нет")
  }

  if (status.accounts === "available") {
    labels.push("Учтены счета")
  } else if (status.accounts === "empty") {
    labels.push("Счета не найдены")
  }

  if (status.marketData === "partial") {
    labels.push("Часть рыночных данных недоступна")
  } else if (status.marketData === "unavailable") {
    labels.push("Актуальные цены недоступны")
  }

  return labels
}

export function AIAssistant() {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isLoading])

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: nextMessages
            .filter((message) => message.type !== "error")
            .map((message) => ({ role: message.role, content: message.content })),
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : friendlyError)
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: typeof data?.message === "string" ? data.message : friendlyError,
        timestamp: new Date(),
        contextStatus: data?.contextStatus,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error && error.message ? error.message : t("ai.error"),
        timestamp: new Date(),
        type: "error",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        aria-label={t("ai.open")}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary shadow-lg hover:bg-primary/90"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 flex h-[min(680px,calc(100vh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden border bg-card shadow-2xl">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">{t("ai.title")}</CardTitle>
              <p className="truncate text-xs text-muted-foreground">Портфель, риски, доходность</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label={t("ai.close")}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center gap-4 py-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">AI-ассистент по инвестициям</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Помогу проанализировать активы, риски, доходность и структуру портфеля.
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => void sendMessage(prompt)}
                    className="h-auto justify-start whitespace-normal rounded-md px-3 py-2 text-left text-xs font-normal"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user"
                const contextLabels = getContextLabels(message.contextStatus)

                return (
                  <div key={`${message.timestamp.toISOString()}-${index}`} className={cn("flex gap-2", isUser && "justify-end")}>
                    {!isUser ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                    ) : null}
                    <div className={cn("max-w-[82%] space-y-2", isUser && "items-end")}>
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm leading-5 shadow-sm",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : message.type === "error"
                              ? "border border-destructive/30 bg-destructive/10 text-foreground"
                              : "border bg-muted/60 text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {contextLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {contextLabels.map((label) => (
                            <Badge key={label} variant="outline" className="gap-1 rounded-md text-[10px] font-medium text-muted-foreground">
                              <Database className="h-3 w-3" />
                              {label}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {isUser ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {isLoading ? (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI думает...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {messages.length > 0 ? (
          <div className="border-t px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.slice(0, 4).map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => void sendMessage(prompt)}
                  className="h-8 shrink-0 rounded-md px-2 text-xs font-normal"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t bg-background p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("ai.placeholder")}
              disabled={isLoading}
              rows={1}
              className="max-h-28 min-h-11 resize-none text-sm"
            />
            <Button
              onClick={() => void sendMessage()}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Отправить сообщение"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">{t("ai.disclaimer")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
