import crypto from "node:crypto"
import { cookies } from "next/headers"

export const SLACK_INSTALL_STATE_COOKIE = "jargon_jar_install_state"
export const SLACK_SIGNIN_STATE_COOKIE = "jargon_jar_signin_state"

export function createOAuthState(cookieName: string) {
  const state = crypto.randomUUID()
  cookies().set(cookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  })
  return state
}

export function consumeOAuthState(cookieName: string, returnedState: string | null) {
  const expectedState = cookies().get(cookieName)?.value
  cookies().delete(cookieName)
  return Boolean(expectedState && returnedState && expectedState === returnedState)
}
