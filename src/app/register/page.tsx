'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ory } from '@/lib/ory'

export default function RegisterPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<any>(null)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize registration flow
    ory
      .createBrowserRegistrationFlow()
      .then(({ data }) => setFlow(data))
      .catch((err) => setError('Failed to initialize registration'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    // Find CSRF token from flow UI nodes
    const csrfNode = flow.ui.nodes.find((node: any) => node.attributes.name === 'csrf_token')
    const csrfToken = csrfNode?.attributes.value

    try {
      const response = await ory.updateRegistrationFlow({
      flow: flow.id,
      updateRegistrationFlowBody: {
        method: 'password',
        password: formData.password,
        traits: { email: formData.email },
        csrf_token: csrfToken,
      },
      })
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed')
    }
  }

  if (!flow) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl mb-4">Register</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="border p-2 mb-4 w-full"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="border p-2 mb-4 w-full"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 w-full">
          Register
        </button>
      </form>
    </div>
  )
}