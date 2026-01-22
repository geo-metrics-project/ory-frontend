"use client"

import { useEffect, useState } from "react"
import { Login } from "@ory/elements-react/theme"
import { LoginFlow, FrontendApi, Configuration } from "@ory/client"
import config from "@/ory.config"

const ory = new FrontendApi(
  new Configuration({
    basePath: config.sdk?.url || "https://kratos.combaldieu.fr/",
    baseOptions: {
      withCredentials: true,
    },
  })
)

export default function LoginPage() {
  const [flow, setFlow] = useState<LoginFlow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flowId = params.get("flow")
    const returnTo = params.get("return_to")

    if (flowId) {
      // Get existing flow
      ory
        .getLoginFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => {
          // Flow expired or invalid, create new one
          window.location.href = returnTo 
            ? `/auth/login?return_to=${encodeURIComponent(returnTo)}`
            : "/auth/login"
        })
    } else {
      // Create new flow
      ory
        .createBrowserLoginFlow({
          returnTo: returnTo || undefined,
        })
        .then(({ data }) => {
          setFlow(data)
          const url = returnTo 
            ? `?flow=${data.id}&return_to=${encodeURIComponent(returnTo)}`
            : `?flow=${data.id}`
          window.history.replaceState({}, "", url)
        })
        .catch((err) => {
          console.error("Error creating login flow:", err)
          setError("Failed to initialize login. Please try again.")
        })
    }
  }, [])

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  if (!flow) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
  }

  return (
    <Login
      flow={flow as any}
      config={config}
      components={{
        Card: {},
      }}
    />
  )
}