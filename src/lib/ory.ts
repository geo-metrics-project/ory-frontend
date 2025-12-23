// filepath: /home/simbaduzoo/Documents/ory-frontend/src/lib/ory.ts
import { Configuration, FrontendApi } from '@ory/client'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL,
    baseOptions: {
      withCredentials: true,
    },
  })
)

export { ory }