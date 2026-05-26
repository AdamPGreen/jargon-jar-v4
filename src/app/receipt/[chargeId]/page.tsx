import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { charges } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function loadCharge(chargeId: string) {
  if (!UUID_RE.test(chargeId)) return null
  return db.query.charges.findFirst({
    where: eq(charges.id, chargeId),
    with: {
      chargedMember: true,
      chargingMember: true,
      jargonTerm: true,
      workspace: true,
    },
  })
}

function formatAmount(amount: string) {
  return Number(amount).toFixed(2)
}

function buildSlackDeepLink(input: {
  channelId: string
  messageTs: string
  slackTeamId: string
}) {
  const params = new URLSearchParams({
    channel: input.channelId,
    team: input.slackTeamId,
    message_ts: input.messageTs,
  })
  return `https://slack.com/app_redirect?${params.toString()}`
}

export async function generateMetadata({
  params,
}: {
  params: { chargeId: string }
}): Promise<Metadata> {
  const charge = await loadCharge(params.chargeId)
  if (!charge) return { title: "Citation · Jargon Jar" }

  const citationNumber = charge.id.slice(0, 8).toUpperCase()
  const amount = formatAmount(charge.amount)
  return {
    title: `Citation #${citationNumber} · Jargon Jar`,
    description: `${charge.chargedMember.displayName} was fined $${amount} for "${charge.jargonTerm.term}".`,
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: { chargeId: string }
}) {
  const charge = await loadCharge(params.chargeId)
  if (!charge) notFound()

  const citationNumber = charge.id.slice(0, 8).toUpperCase()
  const amount = formatAmount(charge.amount)

  const slackDeepLink =
    charge.messageTs && charge.channelId && charge.workspace?.slackTeamId
      ? buildSlackDeepLink({
          channelId: charge.channelId,
          messageTs: charge.messageTs,
          slackTeamId: charge.workspace.slackTeamId,
        })
      : null

  const filed = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(charge.createdAt)

  return (
    <div className="relative min-h-screen bg-[#F2ECD9] text-[#0B0B0E] selection:bg-[#FFD400] selection:text-[#0B0B0E]">
      <div
        aria-hidden
        className="bg-paper-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
      />
      <div
        aria-hidden
        className="bg-paper-rules pointer-events-none fixed inset-0 z-[1] opacity-[0.05]"
      />

      <div className="relative z-[2] flex min-h-screen flex-col">
        <header className="border-b-2 border-[#0B0B0E]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-[15px] uppercase tracking-[0.18em]"
            >
              <Image
                src="/images/coin-jar-no-shadow.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 object-contain"
                priority
              />
              <span className="font-stamp text-[13px] md:text-[14px]">
                Jargon Jar
              </span>
              <span className="hidden text-[11px] tracking-[0.22em] text-[#0B0B0E]/55 lg:inline">
                / DEPT. OF FINES
              </span>
            </Link>

            <Link
              href="/dashboard"
              className="text-[11px] uppercase tracking-[0.18em] underline decoration-[#0B0B0E]/40 decoration-1 underline-offset-[5px] hover:text-[#DC2626] hover:decoration-[#DC2626] md:text-[12px]"
            >
              Open dashboard →
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-[520px]">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
              <span>§ I · Public record</span>
              <span>File no. JJ-V4-{citationNumber.slice(0, 4)}</span>
            </div>

            <article className="receipt-shadow-lg relative mt-5 border-2 border-[#0B0B0E] bg-[#F2ECD9] p-6 md:p-8">
              <div
                aria-hidden
                className="absolute -right-3 -top-5 z-[3] rotate-[12deg] border-[3px] border-[#DC2626] bg-[#F2ECD9] px-3 py-1 receipt-shadow"
              >
                <div className="font-stamp text-[22px] leading-none tracking-[0.06em] text-[#DC2626] md:text-[26px]">
                  FINED
                </div>
                <div className="text-center text-[8px] uppercase tracking-[0.22em] text-[#DC2626] md:text-[9px]">
                  EST. 2024
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 border-b-2 border-[#0B0B0E] pb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
                    Citation
                  </div>
                  <div className="font-stamp mt-1 text-[22px] uppercase leading-none tracking-[0.04em] md:text-[26px]">
                    Issued
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
                    Citation no.
                  </div>
                  <div className="mt-1 font-mono text-[14px] tracking-[0.05em]">
                    #{citationNumber}
                  </div>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-[13px]">
                <DetailRow label="Offender" value={charge.chargedMember.displayName} />
                <DetailRow
                  label="Issuing officer"
                  value={charge.chargingMember.displayName}
                />
                <DetailRow label="Workspace" value={charge.workspace.name} />
              </dl>

              <div className="my-6 border-t border-dashed border-[#0B0B0E]/40" />

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
                    Charge
                  </div>
                  <div className="mt-2 truncate text-[18px] italic text-[#0B0B0E]/90">
                    &quot;{charge.jargonTerm.term}&quot;
                  </div>
                </div>
                <div className="font-stamp shrink-0 text-[44px] leading-none md:text-[52px]">
                  ${amount}
                </div>
              </div>

              <div className="my-6 border-t border-dashed border-[#0B0B0E]/40" />

              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#DC2626]">
                  Total due
                </div>
                <div className="font-stamp text-[24px] text-[#DC2626] md:text-[28px]">
                  ${amount}
                </div>
              </div>

              {charge.messageText && (
                <div className="mt-7 border-l-[3px] border-[#0B0B0E] pl-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
                    Exhibit A
                  </div>
                  <blockquote className="mt-2 text-[14px] italic leading-[1.55] text-[#0B0B0E]/85">
                    &quot;{charge.messageText}&quot;
                  </blockquote>
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 border-t border-dotted border-[#0B0B0E]/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
                  Filed {filed}
                </div>
                {slackDeepLink && (
                  <a
                    href={slackDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-stamp inline-flex items-center gap-2 self-start bg-[#0B0B0E] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#F2ECD9] transition-colors hover:bg-[#DC2626] sm:self-auto"
                  >
                    View original in Slack
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
            </article>

            <div className="mt-10 text-center">
              <Link
                href="/dashboard"
                className="text-[11px] uppercase tracking-[0.18em] underline decoration-[#0B0B0E]/40 decoration-1 underline-offset-[5px] hover:text-[#DC2626]"
              >
                ← back to dashboard
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t-2 border-[#0B0B0E]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-5 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <span>© {new Date().getFullYear()} Jargon Jar · Dept. of Fines</span>
            <span>Citation #{citationNumber}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-[#0B0B0E]/30 pb-2">
      <dt className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
        {label}
      </dt>
      <dd className="font-stamp text-[14px] uppercase tracking-[0.04em]">
        {value}
      </dd>
    </div>
  )
}
