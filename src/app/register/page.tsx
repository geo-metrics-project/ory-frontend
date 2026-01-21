'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any
type UiNode = any

export const dynamic = 'force-dynamic'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const flowId = params.get('flow')

  useEffect(() => {
    setErrors([])
    setIsLoading(true)

    if (flowId) {
      ory
        .getRegistrationFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          setErrors(['Impossible de charger le flow d\'inscription.'])
          setIsLoading(false)
        })
      return
    }

    ory
      .createBrowserRegistrationFlow()
      .then(({ data }) => {
        setFlow(data)
        setIsLoading(false)
      })
      .catch((err) => {
        if (err?.response?.status === 400 || err?.response?.data?.error?.id === 'session_already_available') {
          window.location.href = 'https://geometrics.combaldieu.fr'
        } else {
          setErrors(['Impossible d\'initialiser l\'inscription.'])
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
    formData.forEach((value, key) => { values[key] = value })

    // Ensure method is set (required by Kratos)
    if (!values.method) {
      values.method = 'profile'
    }

    try {
      await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: values
      })

      // Redirect to return_to if present
      const returnTo = flow?.return_to || 'https://geometrics.combaldieu.fr'
      window.location.href = returnTo
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      const errorMessages: string[] = []

      if (data?.ui?.messages) {
        data.ui.messages.forEach((msg: any) => {
          if (msg.type === 'error') errorMessages.push(msg.text)
        })
      }

      if (data?.ui?.nodes) {
        data.ui.nodes.forEach((node: any) => {
          node.messages?.forEach((msg: any) => {
            if (msg.type === 'error') {
              const fieldName = node.attributes?.name || 'champ'
              errorMessages.push(`${fieldName}: ${msg.text}`)
            }
          })
        })
      }

      if (errorMessages.length === 0) {
        errorMessages.push(err?.response?.data?.error?.message || 'Inscription impossible.')
      }

      setErrors(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderNode = (node: UiNode) => {
    const attrs = node.attributes
    const nodeType = attrs.node_type

    if (nodeType === 'script' || nodeType === 'text') return null

    // Hidden inputs (CSRF, method)
    if (attrs.type === 'hidden') {
      return <input key={attrs.name} type="hidden" name={attrs.name} value={attrs.value} />
    }

    // Submit button
    if (attrs.type === 'submit' || nodeType === 'button') {
      return (
        <button
          key={attrs.name}
          type="submit"
          name={attrs.name}
          value={attrs.value || ''}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Inscription en cours...' : node.meta?.label?.text || 'S\'inscrire'}
        </button>
      )
    }

    // Regular input fields
    const label = node.meta?.label?.text || attrs.name
    const hasError = node.messages && node.messages.some((m: any) => m.type === 'error')
    const isPassword = attrs.type === 'password'
    const isEmail = attrs.name === 'traits.email'

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
          {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
          <input
            className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border-2 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-teal-100 bg-teal-50'
            } focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400`}
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
        <p className="text-teal-700 font-medium">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-yellow-200">
        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {errors.length === 1 ? <p>{errors[0]}</p> : <ul className="list-disc list-inside space-y-1">{errors.map((err, idx) => <li key={idx}>{err}</li>)}</ul>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" action={flow?.ui.action} method={flow?.ui.method}>
          {flow?.ui.nodes.map((node: UiNode) => renderNode(node))}
        </form>
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
