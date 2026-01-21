'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any

export const dynamic = 'force-dynamic'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const flowId = params.get('flow')

  useEffect(() => {
    setErrors([])

    if (flowId) {
      ory
        .getRegistrationFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => setErrors(['Impossible de charger le flow d\'inscription.']))
      return
    }

    ory
      .createBrowserRegistrationFlow()
      .then(({ data }) => setFlow(data))
      .catch((err) => {
        // If user is already logged in, redirect to geometrics
        if (err?.response?.status === 400 || err?.response?.data?.error?.id === 'session_already_available') {
          window.location.href = 'https://geometrics.combaldieu.fr'
        } else {
          setErrors(['Impossible d\'initialiser l\'inscription.'])
        }
      })
  }, [flowId])

  const csrfToken = useMemo(() => {
    const node = flow?.ui?.nodes?.find((n: any) => n.attributes?.name === 'csrf_token')
    return node?.attributes?.value
  }, [flow])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return
    setErrors([])

    try {
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'password',
          password,
          traits: { email },
          csrf_token: csrfToken,
        },
      })

      // Let Ory handle the redirect (to verification or after url)
      if ((response.data as any)?.redirect_browser_to) {
        window.location.href = (response.data as any).redirect_browser_to
      } else {
        router.push('/login')
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      // Extract all error messages from Ory flow
      const errorMessages: string[] = []
      
      // Global UI messages
      if (data?.ui?.messages) {
        data.ui.messages.forEach((msg: any) => {
          if (msg.type === 'error') {
            errorMessages.push(msg.text)
          }
        })
      }
      
      // Field-specific errors from nodes
      if (data?.ui?.nodes) {
        data.ui.nodes.forEach((node: any) => {
          if (node.messages) {
            node.messages.forEach((msg: any) => {
              if (msg.type === 'error') {
                const fieldName = node.attributes?.name || 'champ'
                errorMessages.push(`${fieldName}: ${msg.text}`)
              }
            })
          }
        })
      }
      
      // Fallback error
      if (errorMessages.length === 0) {
        errorMessages.push(
          err?.response?.data?.error?.message || 'Inscription impossible.'
        )
      }
      
      setErrors(errorMessages)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-yellow-200">
        {/* En-tête avec logo/icône */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-teal-400 flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-teal-600 bg-clip-text text-transparent">
            Inscription
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">Rejoignez notre communauté</p>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                {errors.length === 1 ? (
                  <p>{errors[0]}</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {csrfToken && <input type="hidden" name="csrf_token" value={csrfToken} readOnly />}

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
              Vous recevrez un email de confirmation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-teal-700">Mot de passe</label>
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
            <p className="text-xs text-teal-600 opacity-70">
              Minimum 8 caractères avec chiffres et lettres.
            </p>
          </div>

          <div className="flex items-start space-x-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              En vous inscrivant, vous acceptez nos <a href="#" className="underline font-medium">conditions d'utilisation</a> et notre <a href="#" className="underline font-medium">politique de confidentialité</a>.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
          >
            <span className="flex items-center justify-center">
              Créer mon compte
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-yellow-100">
          <div className="flex items-center justify-center mb-4">
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-yellow-300 to-transparent"></div>
            <span className="px-4 text-sm text-teal-600">Déjà membre ?</span>
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-yellow-300 to-transparent"></div>
          </div>
          
          <a
            href="/login"
            className="block w-full py-3 px-4 rounded-xl border-2 border-teal-400 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 text-teal-700 font-semibold text-center shadow-sm hover:shadow-md transition-all duration-200 hover:border-teal-500"
          >
            <span className="flex items-center justify-center">
              Se connecter
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </span>
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-teal-500 opacity-70">
            Votre sécurité est notre priorité. Toutes les données sont cryptées.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}