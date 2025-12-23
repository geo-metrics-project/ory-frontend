'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ory } from '@/lib/ory'

export default function LoginPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<any>(null)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Initializing login flow...')
    ory
      .createBrowserLoginFlow()
      .then(({ data }) => {
        console.log('Flow initialized:', data)
        setFlow(data)
      })
      .catch((err) => {
        console.log('Error initializing flow:', err)
        setError('Failed to initialize login')
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    // Find CSRF token from flow UI nodes
    const csrfNode = flow.ui.nodes.find((node: any) => node.attributes.name === 'csrf_token')
    const csrfToken = csrfNode?.attributes.value

    try {
      const response = await ory.updateLoginFlow({
      flow: flow.id,
      updateLoginFlowBody: {
        method: 'password',
        password: formData.password,
        identifier: formData.email,
        csrf_token: csrfToken,
      },
      })
    } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Login failed')
    }
  }

  if (!flow) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl mb-4">Login</h1>
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
          Login
        </button>
      </form>
    </div>
  )
}