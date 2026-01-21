'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any

export const dynamic = 'force-dynamic'

function VerificationForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const flowId = params.get('flow')
  const code = params.get('code')

  useEffect(() => {
    setError(null)

    if (flowId) {
      ory
        .getVerificationFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => setError('Impossible de charger le flow de vérification.'))
      return
    }

    // If no flow, redirect to login
    if (!code) {
      router.push('/login')
    }
  }, [flowId, code, router])

  const csrfToken = useMemo(() => {
    const node = flow?.ui?.nodes?.find((n: any) => n.attributes?.name === 'csrf_token')
    return node?.attributes?.value
  }, [flow])

  // Auto-verify when code is present
  useEffect(() => {
    if (code && flow && csrfToken && !verifying) {
      setVerifying(true)
      setError(null)

      ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          method: 'code',
          code,
          csrf_token: csrfToken,
        } as any,
      })
      .then((response) => {
        if ((response.data as any)?.redirect_browser_to) {
          window.location.href = (response.data as any).redirect_browser_to
        } else {
          window.location.href = 'https://geometrics.combaldieu.fr'
        }
      })
      .catch((err: any) => {
        setVerifying(false)
        const data = err?.response?.data
        if (data?.ui) setFlow(data)

        const msg =
          data?.ui?.messages?.[0]?.text ||
          err?.response?.data?.error?.message ||
          'Erreur lors de la vérification.'
        setError(msg)
      })
    }
  }, [code, flow, csrfToken, verifying])

  // Extract email from flow if it exists (for display only)
  const emailNode = flow?.ui?.nodes?.find((n: any) => n.attributes?.name === 'email')
  const emailFromFlow = emailNode?.attributes && 'value' in emailNode.attributes ? emailNode.attributes.value as string : undefined

  // If redirected from registration (flow but no code), show "check your email" message
  if (flow && !code) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-teal-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-500 bg-clip-text text-transparent">
              Vérifiez votre email
            </h1>
            <p className="mt-2 text-teal-700 opacity-80 text-center">
              Un email de vérification a été envoyé{emailFromFlow ? ` à ${emailFromFlow}` : ''}
            </p>
          </div>

          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-700 shadow-sm mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold mb-1">Étapes suivantes</p>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Consultez votre boîte de réception</li>
                  <li>Cliquez sur le lien dans l'email</li>
                  <li>Vous serez automatiquement connecté</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-teal-600 mb-4">
            Vous n'avez pas reçu l'email ? Vérifiez vos spams ou contactez le support.
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
            >
              Retour à la connexion
            </a>
          </div>
        </div>
      </main>
    )
  }

  // If verifying with code
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-teal-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-yellow-400 flex items-center justify-center mb-4 shadow-lg">
            {verifying && !error ? (
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-yellow-500 bg-clip-text text-transparent">
            {verifying && !error ? 'Vérification en cours...' : error ? 'Erreur' : 'Vérification'}
          </h1>
          <p className="mt-2 text-teal-700 opacity-80 text-center">
            {verifying && !error ? 'Veuillez patienter' : error ? 'Une erreur est survenue' : 'Vérification de votre email'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
            >
              Retour à la connexion
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerificationForm />
    </Suspense>
  )
}