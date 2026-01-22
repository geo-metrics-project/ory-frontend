import { Login } from "@ory/elements-react/theme"
import { getLoginFlow, OryPageParams } from "@ory/nextjs/app"
import config from "@/ory.config"
import { cookies } from "next/headers"

export default async function LoginPage(props: OryPageParams) {
  // Access cookies to ensure they're available in the server context
  await cookies()
  
  const flow = await getLoginFlow(config, props.searchParams)
  
  if (!flow) {
    return null
  }
  
  return (
    <Login
      flow={flow}
      config={config}
      components={{
        Card: {},
      }}
    />
  )
}