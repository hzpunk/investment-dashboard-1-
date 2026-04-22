"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, FileText, AlertTriangle } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false)
  const [agreeToRisks, setAgreeToRisks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate legal agreements
    if (!agreeToTerms || !agreeToPrivacy || !agreeToRisks) {
      setError("Необходимо принять все обязательные соглашения")
      setIsLoading(false)
      return
    }

    const { error } = await signUp(email, password, username)

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push("/login?registered=true")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Создание аккаунта</CardTitle>
          <CardDescription>Введите данные для регистрации</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="ivanov"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Пароль должен содержать минимум 6 символов</p>
            </div>

            {/* Legal Agreements */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-gray-700">Обязательные соглашения:</p>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                  <span className="text-red-500">*</span> Я принимаю{" "}
                  <Link href="/legal/terms" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Пользовательское соглашение
                  </Link>
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="privacy" 
                  checked={agreeToPrivacy}
                  onCheckedChange={(checked) => setAgreeToPrivacy(checked as boolean)}
                />
                <Label htmlFor="privacy" className="text-sm font-normal cursor-pointer">
                  <span className="text-red-500">*</span> Я принимаю{" "}
                  <Link href="/legal/privacy" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Политику конфиденциальности
                  </Link>{" "}
                  и даю согласие на обработку персональных данных
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="risks" 
                  checked={agreeToRisks}
                  onCheckedChange={(checked) => setAgreeToRisks(checked as boolean)}
                />
                <Label htmlFor="risks" className="text-sm font-normal cursor-pointer">
                  <span className="text-red-500">*</span> Я ознакомлен с{" "}
                  <Link href="/legal/risks" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Уведомлением о рисках
                  </Link>{" "}
                  и понимаю, что инвестиции сопряжены с риском потери капитала
                </Label>
              </div>

              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span> — обязательные для принятия документы
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !agreeToTerms || !agreeToPrivacy || !agreeToRisks}
            >
              {isLoading ? "Создание аккаунта..." : "Создать аккаунт"}
            </Button>
            <div className="text-center text-sm">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Войти
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

