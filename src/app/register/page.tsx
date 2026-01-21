'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'

type Flow = any

export const dynamic = 'force-dynamic'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<Flow>(null)
  const [errors, setErrors] = useState<string[]>([])
  const flowId = params.get('flow')

  // Fetch or create the registration flow
  useEffect(() => {
    setErrors([])

    if (flowId) {
      ory
        .getRegistrationFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => setErrors(["Impossible de charger le flow d'inscription."]))
      return
    }

    ory
      .createBrowserRegistrationFlow()
      .then(({ data }) => setFlow(data))
      .catch((err) => {
        if (err?.response?.status === 400 || err?.response?.data?.error?.id === 'session_already_available') {
          window.location.href = 'https://geometrics.combaldieu.fr'
        } else {
          setErrors(["Impossible d'initialiser l'inscription."])
        }
      })
  }, [flowId])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return
    setErrors([])
    
    const payload: any = { method: 'password' }

    flow.ui.nodes.forEach((node: any) => {
      const name = node.attributes?.name
      const value = node.attributes?.value

      if (!name) return

      // Skip buttons
      if (node.type === 'button' || node.attributes?.type === 'button') return

      // CSRF token can go directly
      if (name === 'csrf_token') {
        payload.csrf_token = value
        return
      }

      // Password field
      if (name === 'password') {
        payload.password = value
        return
      }

      // Other traits (like email, username)
      if (!payload.traits) payload.traits = {}
      payload.traits[name] = value
    })


    try {
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: payload,
      })
      // Registration successful — redirect or handle session
      window.location.href = '/'
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.ui) setFlow(data)

      // Extract all error messages
      const errorMessages: string[] = []

      if (data?.ui?.messages) {
        data.ui.messages.forEach((msg: any) => {
          if (msg.type === 'error') errorMessages.push(msg.text)
        })
      }

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

      if (errorMessages.length === 0) {
        errorMessages.push(err?.response?.data?.error?.message || "Inscription impossible.")
      }

      setErrors(errorMessages)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-yellow-50 to-teal-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-yellow-200">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-teal-600 bg-clip-text text-transparent">
            Inscription
          </h1>
          <p className="mt-2 text-teal-700 opacity-80">Rejoignez notre communauté</p>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {flow?.ui?.nodes?.map((node: any) => {
            const { type, name, value, disabled, required, placeholder } = node.attributes || {}

            // Hidden inputs (like CSRF token)
            if (type === 'hidden') {
              return <input key={name} type="hidden" name={name} value={value} readOnly />
            }

            // Buttons are skipped
            if (type === 'button' || node.type === 'button') return null

            // Determine input type for styling
            let inputType = type || 'text'

            return (
              <div key={name} className="space-y-2">
                {name !== 'csrf_token' && (
                  <label className="text-sm font-semibold text-teal-700">{node.meta?.label?.text || name}</label>
                )}
                <input
                  type={inputType}
                  name={name}
                  value={value || ''}
                  disabled={disabled}
                  required={required}
                  placeholder={placeholder || ''}
                  onChange={(e) => {
                    node.attributes.value = e.target.value
                    setFlow({ ...flow }) // Trigger re-render
                  }}
                  className="w-full pl-3 pr-4 py-3 rounded-xl border-2 border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:ring-opacity-50 focus:outline-none transition-all duration-200 text-teal-800 placeholder-teal-400"
                />
                {node.messages?.map((msg: any, idx: number) => (
                  <p key={idx} className="text-xs text-red-600">{msg.text}</p>
                ))}
              </div>
            )
          })}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
          >
            Créer mon compte
          </button>
        </form>

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
