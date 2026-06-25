import { redirect } from "next/navigation"

/** Root entry: send people into the chat (proxy bounces guests to sign-in). */
export default function Page() {
  redirect("/chat")
}
