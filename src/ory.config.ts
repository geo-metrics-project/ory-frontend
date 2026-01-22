
import type { OryClientConfiguration } from "@ory/elements-react"

const config: OryClientConfiguration = {
  sdk: {
    url: process.env.NEXT_PUBLIC_ORY_SDK_URL || "http://localhost:4000",
  },
  project: {
    default_locale: "en",
    default_redirect_url: "/",
    error_ui_url: "/error",
    locale_behavior: "force_default",
    name: "Ory Next.js App Router Example",
    registration_enabled: true,
    verification_enabled: true,
    recovery_enabled: true,
    registration_ui_url: "/auth/registration",
    verification_ui_url: "/auth/verification",
    recovery_ui_url: "/auth/recovery",
    login_ui_url: "/auth/login",
    settings_ui_url: "/settings",
  },
}

export default config