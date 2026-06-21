import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { charges } from "@/lib/db/schema"

const FONT_DIR = join(process.cwd(), "src/og-assets/fonts")
const loadFont = (file: string) => readFile(join(FONT_DIR, file))

export const runtime = "nodejs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Jargon Jar citation receipt"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAPER = "#F2ECD9"
const INK = "#0B0B0E"
const RED = "#DC2626"
const YELLOW = "#FFD400"

const DISPLAY = "Anton"
const STAMP = "Archivo Black"
const MONO = "IBM Plex Mono"

async function loadCharge(chargeId: string) {
  if (!UUID_RE.test(chargeId)) return null
  return db.query.charges.findFirst({
    where: eq(charges.id, chargeId),
    with: {
      chargedMember: true,
      jargonTerm: true,
    },
  })
}

async function fetchAvatarDataUrl(url: string | null | undefined) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? "image/png"
    if (!contentType.startsWith("image/")) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

// Type that always fits its zone: pick a size from content length.
function fitName(name: string) {
  const len = name.length
  if (len <= 10) return 94
  if (len <= 16) return 76
  if (len <= 24) return 60
  return 48
}

function fitAmount(display: string) {
  const len = display.length
  if (len <= 6) return 200 // $1.00 … $99.00
  if (len === 7) return 178 // $150.00
  if (len === 8) return 152 // $1500.00
  return 128
}

function fitTerm(term: string) {
  const len = term.length
  if (len <= 20) return 46
  if (len <= 38) return 36
  return 30
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export default async function ReceiptOgImage({
  params,
}: {
  params: { chargeId: string }
}) {
  const charge = await loadCharge(params.chargeId)

  const citationNumber = charge?.id.slice(0, 8).toUpperCase() ?? "00000000"
  const rawOffender = charge?.chargedMember.displayName ?? "Unknown"
  const offender = truncate(rawOffender, 26)
  const term = truncate(charge?.jargonTerm.term ?? "—", 52)
  const amount = charge ? Number(charge.amount).toFixed(2) : "0.00"
  const amountDisplay = `$${amount}`
  const avatar = await fetchAvatarDataUrl(charge?.chargedMember.avatarUrl)
  const monogram = rawOffender.trim().charAt(0).toUpperCase() || "?"

  const [antonFont, plexFont, plexItalicFont, archivoFont] = await Promise.all([
    loadFont("Anton-Regular.ttf"),
    loadFont("IBMPlexMono-Regular.ttf"),
    loadFont("IBMPlexMono-Italic.ttf"),
    loadFont("ArchivoBlack-Regular.ttf"),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: 56,
          position: "relative",
          fontFamily: MONO,
        }}
      >
        {/* inner frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            bottom: 24,
            left: 24,
            border: `4px solid ${INK}`,
          }}
        />

        {/* ── header band ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "rgba(11,11,14,0.6)",
              }}
            >
              Jargon Jar / Dept. of Fines
            </span>
            <span
              style={{
                marginTop: 12,
                fontSize: 18,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: "rgba(11,11,14,0.55)",
              }}
            >
              Citation no. #{citationNumber}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: `6px solid ${RED}`,
              padding: "10px 22px",
              transform: "rotate(8deg)",
              background: PAPER,
              boxShadow: `8px 8px 0 0 ${INK}`,
            }}
          >
            <span
              style={{
                fontFamily: STAMP,
                fontSize: 58,
                lineHeight: 1,
                letterSpacing: 4,
                color: RED,
              }}
            >
              FINED
            </span>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 6,
                color: RED,
                marginTop: 4,
              }}
            >
              EST. 2024
            </span>
          </div>
        </div>

        {/* ── offender band: avatar + name ── */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {avatar ? (
            <img
              src={avatar}
              alt=""
              width={132}
              height={132}
              style={{
                width: 132,
                height: 132,
                objectFit: "cover",
                border: `4px solid ${INK}`,
                boxShadow: `7px 7px 0 0 ${INK}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 132,
                height: 132,
                background: YELLOW,
                border: `4px solid ${INK}`,
                boxShadow: `7px 7px 0 0 ${INK}`,
                fontFamily: STAMP,
                fontSize: 64,
                color: INK,
              }}
            >
              {monogram}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 32,
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 18,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "rgba(11,11,14,0.6)",
              }}
            >
              Offender
            </span>
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: fitName(offender),
                lineHeight: 1,
                marginTop: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {offender}
            </span>
          </div>
        </div>

        {/* ── charge band: offense + hero amount ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: 20,
            borderBottom: `3px solid ${INK}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 560,
            }}
          >
            <span
              style={{
                fontSize: 18,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "rgba(11,11,14,0.6)",
              }}
            >
              Charge
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontStyle: "italic",
                fontSize: fitTerm(term),
                marginTop: 10,
                lineHeight: 1.15,
              }}
            >
              &ldquo;{term}&rdquo;
            </span>
          </div>
          <span
            style={{
              fontFamily: DISPLAY,
              fontSize: fitAmount(amountDisplay),
              lineHeight: 0.82,
              letterSpacing: -1,
              color: INK,
            }}
          >
            {amountDisplay}
          </span>
        </div>

        {/* ── footer band: total due + record ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: RED,
              background: YELLOW,
              padding: "8px 14px",
              border: `3px solid ${INK}`,
            }}
          >
            Total due {amountDisplay}
          </div>
          <span
            style={{
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(11,11,14,0.55)",
            }}
          >
            jargonjar · public record
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: DISPLAY, data: antonFont, weight: 400, style: "normal" },
        { name: STAMP, data: archivoFont, weight: 400, style: "normal" },
        { name: MONO, data: plexFont, weight: 400, style: "normal" },
        { name: MONO, data: plexItalicFont, weight: 400, style: "italic" },
      ],
    }
  )
}
