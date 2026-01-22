// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createOryMiddleware } from "@ory/nextjs/middleware"
import oryConfig from "./ory.config"

const oryMiddleware = createOryMiddleware(oryConfig)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Handle the Root "/"
  // Since this is an auth subdomain, "/" shouldn't really exist.
  // We send them to Login by default.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // 2. Run the standard Ory security check for everything else
  return oryMiddleware(request)
}

export const config = {
  matcher: [
    /* * Exclude the specific pages Kratos is pointing to:
     * login, registration, recovery, verification, error
     */
    "/((?!login|registration|recovery|verification|error|api|_next/static|_next/image|favicon.ico).*)",
  ],
}