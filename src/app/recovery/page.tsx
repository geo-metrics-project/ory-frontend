'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any
type UiNode = any

export const dynamic = 'force-dynamic'

function RecoveryForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const flowId = params.get('flow')

  useEffect(() => {
    setErrors([])
    setIsLoading(true)

    if (flowId) {
      ory
        .getRecoveryFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          setErrors(['Impossible de charger le flow de récupération.'])
          setIsLoading(false)
        })
      return
    }

    ory
      .createBrowserRecoveryFlow()
      .then(({ data }) => {
        setFlow(data)
        setIsLoading(false)
      })
      .catch((err) => {
        setErrors(['Impossible d\'initialiser la récupération.'])
        setIsLoading(false)
      })
  }, [flowId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!flow || isSubmitting) return
    
    setErrors([])
    setSuccess(false)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const values: any = {}
    
    formData.forEach((value, key) => {
      values[key] = value
    })

    // Ensure method is set for link recovery
    if (!values.method) {
      values.method = 'link'
    }

    try {
      await ory.updateRecoveryFlow({
        flow: flow.id,
        updateRecoveryFlowBody: values,
      })
      setSuccess(true)
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
          err?.response?.data?.error?.message || 'Récupération impossible.'
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

    // Render hidden inputs silently (CSRF, method, etc.)
    if (attrs.type === 'hidden') {
    return (
        <input
        key={attrs.name}
        type="hidden"
        name={attrs.name}
        value={attrs.value}
        />
    )
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
                Envoi en cours...
              </>
            ) : (
              <>
                {node.meta?.label?.text || 'Envoyer le lien de récupération'}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </>
            )}
          </span>
        </button>
      )
    }

    // Handle input fields
    const label = node.meta?.label?.text || attrs.name
    const isEmail = attrs.name === 'email' || attrs.type === 'email'
    const hasError = node.messages && node.messages.some((m: any) => m.type === 'error')

    const getIcon = () => {
      if (isEmail) {
        return (
          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
            Récupération
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">
            Réinitialisez votre mot de passe
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-6" action={flow?.ui.action} method={flow?.ui.method}>
          {flow?.ui.nodes.map((node: UiNode) => renderNode(node))}
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
      <RecoveryForm />
    </Suspense>
  )
}