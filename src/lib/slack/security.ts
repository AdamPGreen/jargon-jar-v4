import crypto from "node:crypto"

const SLACK_REPLAY_WINDOW_SECONDS = 60 * 5

type SignatureInput = {
  body: string
  timestamp: string
  signingSecret: string
}

export function buildSlackSignature({ body, timestamp, signingSecret }: SignatureInput) {
  return `v0=${crypto
    .createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`
}

export function verifySlackSignature({
  body,
  timestamp,
  signature,
  signingSecret,
}: SignatureInput & { signature: string | null | undefined }) {
  if (!timestamp || !signature || !signingSecret) return false

  const requestTime = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(requestTime)) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - requestTime) > SLACK_REPLAY_WINDOW_SECONDS) return false

  const expectedSignature = buildSlackSignature({ body, timestamp, signingSecret })

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

export function verifySlackRequest(request: Request, body: string) {
  return verifySlackSignature({
    body,
    timestamp: request.headers.get("x-slack-request-timestamp") ?? "",
    signature: request.headers.get("x-slack-signature"),
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
  })
}
