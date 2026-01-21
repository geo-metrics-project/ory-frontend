'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'
import type { UpdateRegistrationFlowBody, RegistrationFlow } from '@ory/client' 

// --- Types ---
// Use the SDK's RegistrationFlow type to stay compatible with @ory/client
type Flow = RegistrationFlow

// --- Component ---
export const dynamic = 'force-dynamic'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const flowId = params.get('flow')

  const [flow, setFlow] = useState<Flow | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [info, setInfo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Load or create registration flow ---
  useEffect(() => {
    setErrors([])
    setInfo(null)
    setIsLoading(true)

    const loadFlow = async () => {
      try {
        const { data } = flowId
          ? await ory.getRegistrationFlow({ id: flowId })
          : await ory.createBrowserRegistrationFlow()
        setFlow(data)
      } catch (err: any) {
        if (err?.response?.status === 400 || err?.response?.data?.error?.id === 'session_already_available') {
          window.location.href = 'https://geometrics.combaldieu.fr'
          return
        }
        setErrors(['Impossible de charger le flow d’inscription.'])
      } finally {
        setIsLoading(false)
      }
    }

    loadFlow()
  }, [flowId])

  // --- Handle form submit ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!flow || isSubmitting) return

    setErrors([])
    setInfo(null)
    setIsSubmitting(true)

    try {
      // Collect form data
      const formData = new FormData(e.currentTarget)
      const rawValues: Record<string, FormDataEntryValue> = {}
      formData.forEach((v, k) => { rawValues[k] = v })

      // Normalize to strings
      const values: Record<string, string> = {}
      Object.entries(rawValues).forEach(([k, v]) => { values[k] = typeof v === 'string' ? v : '' })

      // Ensure method is set
      if (!values.method) values.method = 'password'

      // Cast to SDK expected type (discriminated union)
      const body = values as unknown as UpdateRegistrationFlowBody

      const { data } = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: body,
      })

      // Only update the flow state when the response contains a UI (some responses are success objects)
      if ((data as any)?.ui) setFlow(data as unknown as RegistrationFlow)

      // --- Detect pending verification ---
      const requiresVerification =
        (data as any).state === 'pending_verification' ||
        (data as any).ui?.messages?.some((msg: any) => msg.type === 'info')

      if (requiresVerification) {
        setInfo('Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.')
      } else {
        // Registration complete, redirect
        window.location.href = 'https://geometrics.combaldieu.fr'
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data as unknown as RegistrationFlow)

      const errorMessages: string[] = []

      // Global errors
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

  // --- Render input nodes dynamically ---
  const renderNode = (node: any) => {
    const attrs = node?.attributes || {}
    if (!node) return null

    const type = attrs.type || 'text'
    const isPassword = type === 'password' || (attrs.name && attrs.name.toLowerCase().includes('password'))
    const inputType = isPassword ? 'password' : type
    const hasError = node.messages?.some((m: any) => m.type === 'error')
    const label = node.meta?.label?.text || attrs.name || ''

    if (attrs.node_type === 'script' || attrs.node_type === 'text') return null
    if (attrs.type === 'hidden') return <input key={attrs.name || 'hidden'} type="hidden" name={attrs.name} value={attrs.value || ''} />
    if (attrs.type === 'submit' || attrs.node_type === 'button') {
      return (
        <button
          key={attrs.name || 'submit'}
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

    return (
      <div key={attrs.name || JSON.stringify(node)} className="space-y-2">
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
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
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
          {flow?.ui.nodes?.map((n: any) => renderNode(n))}
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
