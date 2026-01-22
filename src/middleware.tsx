
import { createOryMiddleware } from "@ory/nextjs/middleware"
import oryConfig from "./ory.config"

// This function can be marked `async` if using `await` inside
export const middleware = createOryMiddleware(oryConfig)

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth pages (login, register, recovery, verification, settings, error)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|recovery|verification|settings|error).*)',
  ],
}