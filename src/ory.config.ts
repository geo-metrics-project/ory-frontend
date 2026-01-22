
import type { OryClientConfiguration } from "@ory/elements-react"

const config: OryClientConfiguration = {
  sdk: {
    url: process.env.NEXT_PUBLIC_ORY_SDK_URL || "https://kratos.combaldieu.fr/",
    options: {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },
  project: {
    default_locale: "fr",
    default_redirect_url: "https://geometrics.combaldieu.fr",
    error_ui_url: "https://auth.combaldieu.fr/error",
    locale_behavior: "force_default",
    name: "GEO-Metrics",
    registration_enabled: true,
    verification_enabled: true,
    recovery_enabled: true,
    registration_ui_url: "https://auth.combaldieu.fr/auth/registration",
    verification_ui_url: "https://auth.combaldieu.fr/auth/verification",
    recovery_ui_url: "https://auth.combaldieu.fr/auth/recovery",
    login_ui_url: "https://auth.combaldieu.fr/auth/login",
    settings_ui_url: "https://auth.combaldieu.fr/settings",
  },
}

export default config