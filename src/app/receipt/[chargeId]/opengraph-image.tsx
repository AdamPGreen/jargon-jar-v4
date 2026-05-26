import { ImageResponse } from "next/og"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { charges } from "@/lib/db/schema"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Jargon Jar citation receipt"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAPER = "#F2ECD9"
const INK = "#0B0B0E"
const RED = "#DC2626"
const YELLOW = "#FFD400"

const HEADING_FONT =
  'Impact, "Helvetica Neue Condensed Black", "Arial Black", sans-serif'
const MONO_FONT = 'Menlo, Consolas, "Courier New", monospace'
const SERIF_FONT = 'Georgia, "Times New Roman", serif'

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

export default async function ReceiptOgImage({
  params,
}: {
  params: { chargeId: string }
}) {
  const charge = await loadCharge(params.chargeId)

  const citationNumber = charge?.id.slice(0, 8).toUpperCase() ?? "00000000"
  const offender = charge?.chargedMember.displayName ?? "Unknown"
  const term = charge?.jargonTerm.term ?? "—"
  const amount = charge ? Number(charge.amount).toFixed(2) : "0.00"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          padding: 56,
          position: "relative",
          fontFamily: MONO_FONT,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: `4px solid ${INK}`,
            pointerEvents: "none",
          }}
        />

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
              padding: "12px 22px",
              transform: "rotate(8deg)",
              background: PAPER,
              boxShadow: `8px 8px 0 0 ${INK}`,
            }}
          >
            <span
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 72,
                lineHeight: 1,
                letterSpacing: 4,
                color: RED,
              }}
            >
              FINED
            </span>
            <span
              style={{
                fontSize: 16,
                letterSpacing: 6,
                color: RED,
                marginTop: 6,
              }}
            >
              EST. 2024
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
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
              fontFamily: HEADING_FONT,
              fontSize: 96,
              lineHeight: 0.95,
              marginTop: 10,
              textTransform: "uppercase",
              letterSpacing: -2,
            }}
          >
            {offender}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 40,
            paddingBottom: 22,
            borderBottom: `3px solid ${INK}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 640,
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
                fontFamily: SERIF_FONT,
                fontStyle: "italic",
                fontSize: 56,
                marginTop: 8,
                lineHeight: 1.05,
              }}
            >
              &ldquo;{term}&rdquo;
            </span>
          </div>
          <span
            style={{
              fontFamily: HEADING_FONT,
              fontSize: 180,
              lineHeight: 0.85,
              letterSpacing: -4,
              color: INK,
            }}
          >
            ${amount}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          <span
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
            Total due ${amount}
          </span>
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
    { ...size }
  )
}
