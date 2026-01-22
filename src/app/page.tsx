import { redirect } from "next/navigation"

export default function Home() {
  // Simply redirect to your login page on the server
  // Make sure this matches the path in your ory.config.ts
  redirect("/login")
}