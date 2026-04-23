"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, FileText, Shield } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/contexts/i18n-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const { t } = useI18n()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!agreeToTerms || !agreeToPrivacy || !agreeToRisks) {
      setError(t("auth.acceptAllRequired"))
      setIsLoading(false)
      return
    }

    const { error: signUpError } = await signUp(email, password, username)
    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    router.push("/login?registered=true")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("auth.createAccount")}</CardTitle>
          <CardDescription>{t("auth.registerDescription")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <Input
                id="username"
                placeholder="ivanov"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
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
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
            </div>

            <div className="space-y-3 border-t pt-2">
              <p className="text-sm font-medium text-gray-700">{t("auth.requiredAgreements")}</p>

              <div className="flex items-start space-x-2">
                <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(Boolean(checked))} />
                <Label htmlFor="terms" className="cursor-pointer text-sm font-normal">
                  <span className="text-red-500">*</span> {t("auth.accept")}{" "}
                  <Link href="/legal/terms" target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    <FileText className="h-3 w-3" />
                    {t("auth.terms")}
                  </Link>
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox id="privacy" checked={agreeToPrivacy} onCheckedChange={(checked) => setAgreeToPrivacy(Boolean(checked))} />
                <Label htmlFor="privacy" className="cursor-pointer text-sm font-normal">
                  <span className="text-red-500">*</span> {t("auth.accept")}{" "}
                  <Link href="/legal/privacy" target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    <Shield className="h-3 w-3" />
                    {t("auth.privacy")}
                  </Link>{" "}
                  {t("auth.consentText")}
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox id="risks" checked={agreeToRisks} onCheckedChange={(checked) => setAgreeToRisks(Boolean(checked))} />
                <Label htmlFor="risks" className="cursor-pointer text-sm font-normal">
                  <span className="text-red-500">*</span>{" "}
                  <Link href="/legal/risks" target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    <AlertTriangle className="h-3 w-3" />
                    {t("auth.risks")}
                  </Link>{" "}
                  {t("auth.riskAcknowledge")}
                </Label>
              </div>

              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span> {t("auth.requiredMark")}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading || !agreeToTerms || !agreeToPrivacy || !agreeToRisks}>
              {isLoading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </Button>
            <div className="text-center text-sm">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                {t("auth.login")}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
