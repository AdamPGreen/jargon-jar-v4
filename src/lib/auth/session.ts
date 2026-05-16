import crypto from "node:crypto"
import { cookies } from "next/headers"

export const DASHBOARD_SESSION_COOKIE = "jargon_jar_session"

export type DashboardSession = {
  slackUserId: string
  slackTeamId: string
  workspaceId: string
  displayName: string
  avatarUrl: string | null
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url")
}

export function signSession(session: DashboardSession, secret: string) {
  const payload = encode(JSON.stringify(session))
  return `${payload}.${sign(payload, secret)}`
}

export function verifySession(token: string | undefined, secret: string) {
  if (!token || !secret) return null

  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expectedSignature = sign(payload, secret)
  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null
    }

    const parsed = JSON.parse(decode(payload)) as Partial<DashboardSession>
    if (
      !parsed.slackUserId ||
      !parsed.slackTeamId ||
      !parsed.workspaceId ||
      !parsed.displayName
    ) {
      return null
    }

    return {
      slackUserId: parsed.slackUserId,
      slackTeamId: parsed.slackTeamId,
      workspaceId: parsed.workspaceId,
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl ?? null,
    }
  } catch {
    return null
  }
}

export function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET
  if (!secret) throw new Error("Missing APP_SESSION_SECRET")
  return secret
}

export function getDashboardSession() {
  return verifySession(
    cookies().get(DASHBOARD_SESSION_COOKIE)?.value,
    getSessionSecret()
  )
}

export function setDashboardSession(session: DashboardSession) {
  cookies().set(DASHBOARD_SESSION_COOKIE, signSession(session, getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearDashboardSession() {
  cookies().delete(DASHBOARD_SESSION_COOKIE)
}
