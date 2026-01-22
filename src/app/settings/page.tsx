"use client"

import { useEffect, useState } from "react"
import { Settings } from "@ory/elements-react/theme"
import { SettingsFlow, FrontendApi, Configuration } from "@ory/client"
import config from "@/ory.config"

const ory = new FrontendApi(
  new Configuration({
    basePath: config.sdk?.url || "https://kratos.combaldieu.fr/",
    baseOptions: {
      withCredentials: true,
    },
  })
)

export default function SettingsPage() {
  const [flow, setFlow] = useState<SettingsFlow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flowId = params.get("flow")
    const returnTo = params.get("return_to")

    if (flowId) {
      // Get existing flow
      ory
        .getSettingsFlow({ id: flowId })
        .then(({ data }) => setFlow(data))
        .catch(() => {
          // Flow expired or invalid, create new one
          window.location.href = returnTo 
            ? `/settings?return_to=${encodeURIComponent(returnTo)}`
            : "/settings"
        })
    } else {
      // Create new flow
      ory
        .createBrowserSettingsFlow({
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
          console.error("Error creating settings flow:", err)
          setError("Failed to initialize settings. Please try again.")
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
    <Settings
      flow={flow as any}
      config={config}
      components={{
        Card: {},
      }}
    />
  )
}