'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any
type UiNode = any

export const dynamic = 'force-dynamic'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const flowId = params.get('flow')
  const message = params.get('message')

  useEffect(() => {
    setErrors([])
    setIsLoading(true)

    if (flowId) {
      ory
        .getLoginFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          setErrors(['Impossible de charger le flow de connexion.'])
          setIsLoading(false)
        })
      return
    }

    ory
      .createBrowserLoginFlow()
      .then(({ data }) => {
        setFlow(data)
        setIsLoading(false)
      })
      .catch((err) => {
        // If user is already logged in, redirect to geometrics
        if (err?.response?.status === 400 || err?.response?.data?.error?.id === 'session_already_available') {
          window.location.href = 'https://geometrics.combaldieu.fr'
        } else {
          setErrors(['Impossible d\'initialiser la connexion.'])
          setIsLoading(false)
        }
      })
  }, [flowId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!flow || isSubmitting) return
    
    setErrors([])
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const values: any = {}
    
    formData.forEach((value, key) => {
      values[key] = value
    })

    try {
      await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: values,
      })

      // Use return_to from the flow object (set by Oathkeeper via Kratos)
      const returnTo = flow?.return_to || 'https://geometrics.combaldieu.fr'
      window.location.href = returnTo
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
          err?.response?.data?.error?.message || 'Identifiants invalides.'
        )
      }
      
      setErrors(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderNode = (node: UiNode) => {
    const attrs = node.attributes
    const nodeType = attrs.node_type

    // Skip scripts and other non-input nodes
    if (nodeType === 'script' || nodeType === 'text') {
      return null
    }

    // Handle hidden inputs (like CSRF token)
    if (attrs.type === 'hidden') {
      return <input key={attrs.name} type="hidden" name={attrs.name} value={attrs.value || ''} />
    }

    // Handle submit button
    if (attrs.type === 'submit') {
      return (
        <button
          key={attrs.name}
          type="submit"
          name={attrs.name}
          value={attrs.value || ''}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="flex items-center justify-center">
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion en cours...
              </>
            ) : (
              <>
                {node.meta?.label?.text || 'Se connecter'}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </>
            )}
          </span>
        </button>
      )
    }

    // Handle input fields
    const label = node.meta?.label?.text || attrs.name
    const isPassword = attrs.type === 'password'
    const isEmail = attrs.name === 'identifier' || attrs.type === 'email'
    const hasError = node.messages && node.messages.some((m: any) => m.type === 'error')

    const getIcon = () => {
      if (isEmail) {
        return (
          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      }
      if (isPassword) {
        return (
          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      }
      return null
    }

    const icon = getIcon()

    return (
      <div key={attrs.name} className="space-y-2">
        <label className="text-sm font-semibold text-teal-700">{label}</label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border-2 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-teal-100 bg-teal-50'
            } focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400 disabled:opacity-50 disabled:cursor-not-allowed`}
            type={attrs.type}
            name={attrs.name}
            defaultValue={attrs.value || ''}
            required={attrs.required}
            disabled={attrs.disabled || isSubmitting}
            placeholder={attrs.placeholder || ''}
            autoComplete={attrs.autocomplete}
          />
        </div>
        {node.messages?.map((msg: any, idx: number) => (
          <p key={idx} className={`text-xs ${msg.type === 'error' ? 'text-red-600' : 'text-teal-600'} opacity-70`}>
            {msg.text}
          </p>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-teal-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-teal-700 font-medium">Chargement...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-yellow-500 bg-clip-text text-transparent">
            Connexion
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">Accédez à votre espace personnel</p>
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

        {message && (
          <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" action={flow?.ui.action} method={flow?.ui.method}>
          {flow?.ui.nodes.map((node: UiNode) => renderNode(node))}
        </form>

        <div className="mt-8 pt-6 border-t border-teal-100">
          <div className="flex items-center justify-center mb-4">
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
            <span className="px-4 text-sm text-teal-600">Nouveau ici ?</span>
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-teal-300 to-transparent"></div>
          </div>
          
          <a
            href="/register"
            className="block w-full py-3 px-4 rounded-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-yellow-700 font-semibold text-center shadow-sm hover:shadow-md transition-all duration-200 hover:border-yellow-500"
          >
            <span className="flex items-center justify-center">
              Créer un compte
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-teal-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-teal-700 font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}