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
  const [info, setInfo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const flowId = params.get('flow')

  useEffect(() => {
    setErrors([])
    setInfo(null)
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
        // User already logged in → redirect
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
    setInfo(null)
    setIsSubmitting(true)

    // Collect form data
    const formData = new FormData(e.currentTarget)
    const values: Record<string, string> = {}
    formData.forEach((value, key) => {
      values[key] = value.toString()
    })

    // Ensure method is set
    if (!values.method) values.method = 'password'

    try {
      const { data } = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: values,
      })

      // Detect if verification is required
      // Prefer checking the flow state or nodes instead of parsing text
      const requiresVerification =
        data.state === 'choose_verification' || data.state === 'pending_verification' ||
        data.ui?.nodes?.some((node: any) => {
          const name = node.attributes?.name
          const messages = node.messages || []
          return (
            (name === 'traits.email' || name === 'traits.verification_code') &&
            messages.some((msg: any) => msg.type === 'info')
          )
        })

      if (requiresVerification) {
        setFlow(data)
        setInfo('Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.')
      } else {
        // No verification needed → redirect
        window.location.href = 'https://geometrics.combaldieu.fr'
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      const errorMessages: string[] = []

      // Global UI errors
      data?.ui?.messages?.forEach((msg: any) => {
        if (msg.type === 'error') errorMessages.push(msg.text)
      })

      // Field-level node errors
      data?.ui?.nodes?.forEach((node: any) => {
        node.messages?.forEach((msg: any) => {
          if (msg.type === 'error') {
            const fieldName = node.attributes?.name || 'champ'
            errorMessages.push(`${fieldName}: ${msg.text}`)
          }
        })
      })

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

    if (attrs.type === 'hidden') {
      return <input key={attrs.name} type="hidden" name={attrs.name} value={attrs.value || ''} />
    }

    if (attrs.type === 'submit' || nodeType === 'button') {
      return (
        <button
          key={attrs.name}
          type="submit"
          name={attrs.name}
          value={attrs.value || ''}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Création en cours...' : node.meta?.label?.text || 'Créer mon compte'}
        </button>
      )
    }

    const isPassword = attrs.type === 'password' || attrs.name.toLowerCase().includes('password') || attrs.name === 'traits.password'
    const inputType = isPassword ? 'password' : attrs.type || 'text'
    const isEmail = attrs.name === 'traits.email' || attrs.type === 'email'
    const hasError = node.messages?.some((m: any) => m.type === 'error')
    const label = node.meta?.label?.text || attrs.name

    return (
      <div key={attrs.name} className="space-y-2">
        <label className="text-sm font-semibold text-teal-700">{label}</label>
        <input
          type={inputType}
          name={attrs.name}
          defaultValue={attrs.value || ''}
          required={attrs.required}
          disabled={attrs.disabled || isSubmitting}
          placeholder={attrs.placeholder || ''}
          autoComplete={attrs.autocomplete}
          className={`w-full px-4 py-3 rounded-xl border-2 ${
            hasError ? 'border-red-300 bg-red-50' : 'border-teal-100 bg-teal-50'
          } focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200`}
        />
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
      <div className="min-h-screen flex items-center justify-center">
        Chargement...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-yellow-200">
        {info && (
          <div className="mb-6 rounded-xl border border-teal-400 bg-teal-50 p-4 text-sm text-teal-700 shadow-sm">
            {info}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {errors.map((err, idx) => <p key={idx}>{err}</p>)}
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
    <Suspense fallback={<div>Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
