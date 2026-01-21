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
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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

    ory
      .createBrowserVerificationFlow()
      .then(({ data }) => setFlow(data))
      .catch(() => setError('Impossible d\'initialiser la vérification.'))
  }, [flowId])

  const csrfToken = useMemo(() => {
    const node = flow?.ui?.nodes?.find((n: any) => n.attributes?.name === 'csrf_token')
    return node?.attributes?.value
  }, [flow])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return
    setError(null)

    try {
      if (code) {
        const response = await ory.updateVerificationFlow({
          flow: flow.id,
          updateVerificationFlowBody: {
            method: 'code',
            code,
            csrf_token: csrfToken,
          } as any,
        })

        if ((response.data as any)?.redirect_browser_to) {
          window.location.href = (response.data as any).redirect_browser_to
        } else {
          window.location.href = 'https://geometrics.combaldieu.fr'
        }
      } else {
        await ory.updateVerificationFlow({
          flow: flow.id,
          updateVerificationFlowBody: {
            method: 'link',
            identity: { traits: { email } },
            csrf_token: csrfToken,
          } as any,
        })
        setSuccess(true)
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      const msg =
        data?.ui?.messages?.[0]?.text ||
        err?.response?.data?.error?.message ||
        'Erreur lors de la vérification.'
      setError(msg)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-teal-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-teal-400 flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-500 bg-clip-text text-transparent">
              Email envoyé
            </h1>
            <p className="mt-2 text-teal-700 opacity-80 text-center">
              Si un compte existe avec cette adresse email, vous recevrez un lien de vérification.
            </p>
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-teal-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-yellow-400 flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-yellow-500 bg-clip-text text-transparent">
            Vérification
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">Vérifiez votre adresse email</p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {csrfToken && <input type="hidden" name="csrf_token" value={csrfToken} readOnly />}

          {!code && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-teal-700">Adresse email</label>
              <div className="relative">
                <input
                  className="w-full pl-3 pr-4 py-3 rounded-xl border-2 border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
              <p className="text-xs text-teal-600 opacity-70">Vous recevrez un lien de vérification.</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {code ? 'Valider la vérification' : 'Envoyer le lien de vérification'}
          </button>
        </form>
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