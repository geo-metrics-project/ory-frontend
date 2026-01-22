'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ory } from '@/lib/ory'
import { UserAuthCard } from '@ory/elements'
// This import is crucial - it provides the layout styles
import '@ory/elements/style.css'

function OryLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [flow, setFlow] = useState<any>(null)
  const flowId = params.get('flow')

  useEffect(() => {
    if (flowId) {
      ory.getLoginFlow({ id: flowId }).then(({ data }) => setFlow(data))
    } else {
      ory.createBrowserLoginFlow().then(({ data }) => setFlow(data))
    }
  }, [flowId])

  if (!flow) return null

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <UserAuthCard
          flow={flow}
          flowType="login"
          title="Connexion"
          // Link to your other pages
          additionalProps={{
            signupURL: '/register',
            forgotPasswordURL: '/recovery',
          }}
          // Logic for when the user clicks "Sign In"
          onSubmit={({ body }) =>
            ory.updateLoginFlow({ 
              flow: flow.id, 
              updateLoginFlowBody: body as any 
            })
            .then(() => {
              // Redirect on success
              window.location.href = flow.return_to || 'https://geometrics.combaldieu.fr'
            })
            .catch((err) => {
              // If there's a validation error, Ory sends back a new flow with messages
              if (err.response?.data?.ui) {
                setFlow(err.response.data)
              }
            })
          }
        />
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <OryLoginForm />
    </Suspense>
  )
}