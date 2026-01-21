'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any

export const dynamic = 'force-dynamic'

function RecoveryForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const flowId = params.get('flow')
  const code = params.get('code')

  const isPasswordReset = !!code

  useEffect(() => {
    setError(null)

    if (flowId) {
      ory
        .getRecoveryFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => setError('Impossible de charger le flow de récupération.'))
      return
    }

    ory
      .createBrowserRecoveryFlow()
      .then(({ data }) => setFlow(data))
      .catch((err) => {
        setError('Impossible d\'initialiser la récupération.')
      })
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
      if (isPasswordReset) {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.')
          return
        }
        const response = await ory.updateRecoveryFlow({
          flow: flow.id,
          updateRecoveryFlowBody: {
            method: 'code',
            code,
            password,
            csrf_token: csrfToken,
          } as any,
        })
        // Let Ory handle the redirect after successful password reset
        if ((response.data as any)?.redirect_browser_to) {
          window.location.href = (response.data as any).redirect_browser_to
        } else {
          window.location.href = 'https://geometrics.combaldieu.fr'
        }
      } else {
        await ory.updateRecoveryFlow({
          flow: flow.id,
          updateRecoveryFlowBody: {
            method: 'link',
            email,
            csrf_token: csrfToken,
          },
        })
        setSuccess(true)
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      const msg =
        data?.ui?.messages?.[0]?.text ||
        err?.response?.data?.error?.message ||
        'Erreur lors de la récupération.'
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
              Si un compte existe avec cette adresse email, vous recevrez un lien de récupération.
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
        {/* En-tête avec logo/icône */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-yellow-400 flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-yellow-500 bg-clip-text text-transparent">
            {isPasswordReset ? 'Nouveau mot de passe' : 'Récupération'}
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">
            {isPasswordReset ? 'Définissez votre nouveau mot de passe' : 'Réinitialisez votre mot de passe'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {csrfToken && <input type="hidden" name="csrf_token" value={csrfToken} readOnly />}

          {!isPasswordReset && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-teal-700">Adresse email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
              <p className="text-xs text-teal-600 opacity-70">
                Entrez l'adresse email associée à votre compte.
              </p>
            </div>
          )}

          {isPasswordReset && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-teal-700">Nouveau mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-teal-700">Confirmer le mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
          >
            <span className="flex items-center justify-center">
              {isPasswordReset ? 'Réinitialiser le mot de passe' : 'Envoyer le lien de récupération'}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isPasswordReset ? "M5 13l4 4L19 7" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
              </svg>
            </span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-teal-100">
          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
            >
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RecoveryForm />
    </Suspense>
  )
}