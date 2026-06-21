import Image from "next/image";
import Link from "next/link";
import { anton, plexMono, archivoBlack } from "@/lib/fonts";

type RateRow = { term: string; price: number; tag?: string };

const RATE_SHEET: RateRow[] = [
  { term: "synergy", price: 5, tag: "classic" },
  { term: "circle back", price: 3 },
  { term: "low-hanging fruit", price: 4 },
  { term: "leverage (as a verb)", price: 6, tag: "premium" },
  { term: "boil the ocean", price: 7 },
  { term: "move the needle", price: 4 },
  { term: "ping me", price: 2 },
  { term: "deep dive", price: 3 },
  { term: "north star", price: 5 },
  { term: "let's take this offline", price: 6 },
  { term: "blue-sky thinking", price: 5 },
  { term: "open the kimono", price: 9, tag: "felony" },
  { term: "drink the kool-aid", price: 4 },
  { term: "back-of-the-napkin", price: 3 },
  { term: "we are aligned", price: 4 },
  { term: "value-add", price: 3 },
];

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const installRequired = searchParams.install_required === "true";
  const workspaceHint = searchParams.workspace_hint as string | undefined;

  const tickerRow = [...RATE_SHEET, ...RATE_SHEET];

  return (
    <div
      className="min-h-screen bg-[#F2ECD9] text-[#0B0B0E] selection:bg-[#FFD400] selection:text-[#0B0B0E]"
      style={{ fontFamily: "var(--font-plex-mono), ui-monospace, monospace" }}
    >
      {/* paper grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.04 0 0 0 0 0.04 0 0 0 0 0.05 0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* faint ruled lines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 31px, #0B0B0E 31px 32px)",
        }}
      />

      <div className="relative z-[2]">
        {/* ─────────────── NAV ─────────────── */}
        <header className="border-b-2 border-[#0B0B0E]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-[15px] uppercase tracking-[0.18em]"
            >
              <span className={`${archivoBlack.className} text-[13px] md:text-[14px]`}>
                Jargon Jar
              </span>
              <span className="hidden lg:inline text-[11px] tracking-[0.22em] text-[#0B0B0E]/55">
                / DEPT. OF FINES
              </span>
            </Link>

            <nav className="flex items-center gap-2 md:gap-5">
              <a
                href="#rates"
                className="hidden md:inline text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/70 hover:text-[#0B0B0E]"
              >
                Rate sheet
              </a>
              <a
                href="#how"
                className="hidden md:inline text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/70 hover:text-[#0B0B0E]"
              >
                How it works
              </a>
              <a
                href="/api/auth/signin"
                className="text-[11px] uppercase tracking-[0.16em] underline decoration-[#0B0B0E]/40 decoration-1 underline-offset-[5px] hover:decoration-[#0B0B0E] md:text-[12px] md:tracking-[0.18em]"
              >
                Sign in
              </a>
              <a
                href="/api/slack/install"
                className="group relative inline-flex shrink-0 items-center gap-2 bg-[#0B0B0E] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#F2ECD9] hover:bg-[#FFD400] hover:text-[#0B0B0E] md:px-4 md:text-[12px] md:tracking-[0.18em]"
              >
                <SlackGlyph className="h-3.5 w-3.5" />
                Add to Slack
              </a>
            </nav>
          </div>
        </header>

        {/* ─────────────── HERO ─────────────── */}
        <section className="relative">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 pb-12 pt-8 md:grid-cols-12 md:gap-14 md:px-8 md:pb-24 md:pt-16">
            {/* Left: copy */}
            <div className="md:col-span-7">
              <h1
                className={`${anton.className} mt-4 text-[38px] uppercase leading-[0.88] tracking-[-0.01em] sm:text-[64px] md:mt-5 md:text-[100px] lg:text-[108px]`}
              >
                <span className="block">Keep a running tab</span>
                <span className="block">on your team's</span>
                <span className="relative inline-block">
                  <span className="relative z-10">worst jargon.</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-[-4px] bottom-[6px] z-0 h-[22%] bg-[#FFD400] md:bottom-[14px] md:h-[24%]"
                  />
                </span>
              </h1>

              <p
                className={`${plexMono.className} mt-7 text-[14px] leading-[1.65] text-[#0B0B0E]/80 md:text-[15px]`}
              >
                A Slack app that issues a citation every time someone says
                "synergy", "circle back", or "open the kimono". A receipt prints.
                The leaderboard updates. Pride is taxed.
              </p>

              {installRequired && (
                <div className="mt-7 inline-flex max-w-full items-start gap-3 border-2 border-[#DC2626] bg-[#FFE7E1] px-4 py-3">
                  <span
                    className={`${archivoBlack.className} mt-[2px] inline-block whitespace-nowrap bg-[#DC2626] px-2 py-[2px] text-[10px] uppercase tracking-[0.18em] text-[#F2ECD9]`}
                  >
                    Install required
                  </span>
                  <p className={`${plexMono.className} text-[13px] text-[#0B0B0E]`}>
                    {workspaceHint
                      ? `Add Jargon Jar to ${workspaceHint} before signing in.`
                      : "Add Jargon Jar to your workspace before you can sign in."}
                  </p>
                </div>
              )}

              {/* Primary CTA */}
              <div className="mt-8 inline-flex flex-col items-center">
                <a
                  href="/api/slack/install"
                  className="group relative inline-flex items-center gap-3 whitespace-nowrap bg-[#0B0B0E] px-6 py-3.5 text-[#F2ECD9] shadow-[6px_6px_0_0_#0B0B0E] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_0_#FFD400] sm:px-7 sm:py-4"
                >
                  <SlackGlyph className="h-[18px] w-[18px] shrink-0" />
                  <span
                    className={`${archivoBlack.className} text-[14px] uppercase tracking-[0.12em] sm:text-[15px]`}
                  >
                    Add to Slack
                  </span>
                  <span
                    aria-hidden
                    className="text-[18px] leading-none transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>

                {/* sub-CTA: trust + sign-in, stacked + centered under button */}
                <div
                  className={`${plexMono.className} mt-6 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.18em]`}
                >
                  <span className="text-[#0B0B0E]/55">
                    Free · 30-sec install
                  </span>
                  <a
                    href="/api/auth/signin"
                    className="group inline-flex items-center gap-1.5 text-[#0B0B0E]/75 hover:text-[#0B0B0E]"
                  >
                    Already installed?
                    <span className="underline decoration-1 underline-offset-[5px] group-hover:text-[#DC2626]">
                      Sign in →
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: monkey + receipt */}
            <div className="relative md:col-span-5">
              <div className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px]">
                {/* yellow square frame */}
                <div className="absolute inset-3 rotate-[-3deg] border-2 border-[#0B0B0E] bg-[#FFD400]" />
                <div className="absolute inset-3 rotate-[2deg] border-2 border-[#0B0B0E] bg-[#F2ECD9]" />

                {/* monkey */}
                <Image
                  src="/images/monkey-cool.png"
                  alt="Jargon Jar's enforcement officer"
                  fill
                  className="relative z-[2] object-contain p-6"
                  priority
                />

                {/* FINED stamp */}
                <div
                  aria-hidden
                  className="absolute right-[2%] top-[4%] z-[3] rotate-[12deg] border-[3px] border-[#DC2626] px-2 py-1 md:px-3"
                >
                  <div
                    className={`${archivoBlack.className} text-[22px] leading-none tracking-[0.06em] text-[#DC2626] md:text-[28px]`}
                  >
                    FINED
                  </div>
                  <div
                    className={`${plexMono.className} text-center text-[8px] uppercase tracking-[0.22em] text-[#DC2626] md:text-[9px]`}
                  >
                    EST. 2024
                  </div>
                </div>

                {/* receipt callout bottom-left */}
                <div className="absolute -bottom-2 left-1 z-[3] w-[148px] rotate-[-4deg] border-2 border-[#0B0B0E] bg-[#F2ECD9] p-2 shadow-[4px_4px_0_0_#0B0B0E] sm:w-[170px] sm:p-3 md:w-[180px]">
                  <div
                    className={`${plexMono.className} text-[8px] uppercase tracking-[0.2em] text-[#0B0B0E]/60 sm:text-[9px]`}
                  >
                    Receipt · 11:42 AM
                  </div>
                  <div
                    className={`${plexMono.className} mt-1 flex items-baseline justify-between text-[11px] sm:text-[12px]`}
                  >
                    <span>"synergy"</span>
                    <span className={archivoBlack.className}>$5.00</span>
                  </div>
                  <div
                    className={`${plexMono.className} flex items-baseline justify-between text-[11px] sm:text-[12px]`}
                  >
                    <span>"circle back"</span>
                    <span className={archivoBlack.className}>$3.00</span>
                  </div>
                  <div className="my-1 border-t border-dashed border-[#0B0B0E]/40" />
                  <div
                    className={`${plexMono.className} flex items-baseline justify-between text-[11px] uppercase sm:text-[12px]`}
                  >
                    <span>TOTAL</span>
                    <span className={`${archivoBlack.className} text-[#DC2626]`}>
                      $8.00
                    </span>
                  </div>
                </div>

                {/* small badge top-left */}
                <div
                  className={`${plexMono.className} absolute -left-1 top-1 z-[3] rotate-[-6deg] border-2 border-[#0B0B0E] bg-[#0B0B0E] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[#FFD400] sm:text-[10px]`}
                >
                  +1 violation
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────── TICKER ─────────────── */}
        <section className="relative overflow-hidden border-y-2 border-[#0B0B0E] bg-[#0B0B0E] py-4">
          <div className="ticker-track flex items-center gap-10 whitespace-nowrap">
            {tickerRow.map((row, i) => (
              <div
                key={i}
                className="flex shrink-0 items-baseline gap-3 text-[#F2ECD9]"
              >
                <span
                  className={`${plexMono.className} text-[13px] uppercase tracking-[0.22em]`}
                >
                  {row.term}
                </span>
                <span
                  className={`${archivoBlack.className} text-[16px] text-[#FFD400]`}
                >
                  ${row.price}.00
                </span>
                <span className="text-[#F2ECD9]/30">✦</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── HOW IT WORKS ─────────────── */}
        <section id="how" className="relative">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8 md:py-28">
            <div className="mb-12 flex items-end justify-between border-b-2 border-[#0B0B0E] pb-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
                  § II · Procedure
                </div>
                <h2
                  className={`${anton.className} mt-2 text-[44px] uppercase leading-[0.9] tracking-[-0.005em] md:text-[88px]`}
                >
                  Three steps. <br className="hidden md:block" />One <span className="text-[#DC2626]">jar.</span>
                </h2>
              </div>
              <div
                className={`${plexMono.className} hidden text-right text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55 md:block`}
              >
                File no.<br />
                JJ-V4-0023
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              <Step
                num="01"
                title="Add it to Slack"
                body="One-click OAuth. Jargon Jar joins the workspace as a bot. No accounts, no passwords — your Slack identity is enough."
              >
                <div
                  className={`${plexMono.className} mt-5 inline-flex items-center gap-2 border border-[#0B0B0E]/40 bg-[#F2ECD9] px-3 py-2 text-[11px] uppercase tracking-[0.18em]`}
                >
                  <SlackGlyph className="h-3 w-3 text-[#0B0B0E]" /> Authorize · Done
                </div>
              </Step>

              <Step
                num="02"
                title="Charge a violator"
                body="Type /jargon in any channel. Pick a teammate, the jargon they used, and an amount. Jargon Jar prints a citation."
              >
                <div className="mt-5 rounded-[2px] border border-[#0B0B0E]/40 bg-[#F2ECD9] px-3 py-2 font-mono text-[12px]">
                  <span className="text-[#0B0B0E]/50">$</span>{" "}
                  <span className={archivoBlack.className}>/jargon</span>{" "}
                  <span className="text-[#0B0B0E]/80">@riley</span>{" "}
                  <span className="text-[#DC2626]">"synergy"</span>{" "}
                  <span className="text-[#0B0B0E]/80">$5</span>
                </div>
              </Step>

              <Step
                num="03"
                title="Read the receipts"
                body="A live leaderboard tracks who owes what. Sort by offender, by jargon, by week. Settle up at lunch — or don't."
              >
                <div className={`${plexMono.className} mt-5 space-y-1 text-[12px]`}>
                  <div className="flex items-baseline justify-between border-b border-dashed border-[#0B0B0E]/30 pb-1">
                    <span>🥇 riley</span>
                    <span className={archivoBlack.className}>$47</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-dashed border-[#0B0B0E]/30 pb-1">
                    <span>🥈 sam</span>
                    <span className={archivoBlack.className}>$22</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span>🥉 priya</span>
                    <span className={archivoBlack.className}>$13</span>
                  </div>
                </div>
              </Step>
            </div>
          </div>
        </section>

        {/* ─────────────── LIVE DEMO ─────────────── */}
        <section className="relative bg-[#0B0B0E] text-[#F2ECD9]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #FFD400 1px, transparent 1px), linear-gradient(to bottom, #FFD400 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 py-20 md:grid-cols-12 md:gap-10 md:px-8 md:py-28">
            <div className="md:col-span-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#FFD400]">
                § III · Evidence
              </div>
              <h2
                className={`${anton.className} mt-3 text-[44px] uppercase leading-[0.88] tracking-[-0.005em] md:text-[80px]`}
              >
                Here's what a <span className="text-[#FFD400]">citation</span> looks like.
              </h2>
              <p
                className={`${plexMono.className} mt-5 max-w-[42ch] text-[14px] leading-[1.65] text-[#F2ECD9]/70`}
              >
                Real channel. Real teammate. Real public shame. The receipt posts back
                into the thread so the conversation moves on with a small, measurable
                consequence attached.
              </p>

              <ul
                className={`${plexMono.className} mt-7 space-y-2 text-[12px] uppercase tracking-[0.18em] text-[#F2ECD9]/70`}
              >
                <li className="flex items-start gap-3">
                  <span className="mt-[6px] inline-block h-[3px] w-3 bg-[#FFD400]" />
                  Works in any public or private channel
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-[6px] inline-block h-[3px] w-3 bg-[#FFD400]" />
                  Per-workspace custom rate sheet
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-[6px] inline-block h-[3px] w-3 bg-[#FFD400]" />
                  Running tab posts back for every charge
                </li>
              </ul>
            </div>

            <div className="md:col-span-7">
              <CitationPost />
            </div>
          </div>
        </section>

        {/* ─────────────── RATE SHEET ─────────────── */}
        <section id="rates" className="relative">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8 md:py-28">
            <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b-2 border-[#0B0B0E] pb-5 md:flex-row md:items-end">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
                  § IV · Schedule of fines
                </div>
                <h2
                  className={`${anton.className} mt-2 text-[48px] uppercase leading-[0.88] tracking-[-0.005em] md:text-[96px]`}
                >
                  The <span className="text-[#DC2626]">rate sheet.</span>
                </h2>
              </div>
              <p
                className={`${plexMono.className} max-w-[42ch] text-[13px] text-[#0B0B0E]/70`}
              >
                Starter prices. Your workspace can edit anything — make "synergy"
                free, or charge $20. Vibe-based pricing encouraged.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
              {RATE_SHEET.map((row, i) => (
                <div
                  key={row.term}
                  className="group flex items-baseline gap-3 border-b border-dotted border-[#0B0B0E]/35 py-3 last:border-b-0 md:py-4"
                >
                  <span
                    className={`${plexMono.className} hidden w-7 shrink-0 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/40 sm:inline-block`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`${anton.className} min-w-0 flex-1 text-[20px] uppercase leading-[1.05] tracking-[-0.005em] transition-colors group-hover:text-[#DC2626] sm:text-[22px] md:text-[28px]`}
                  >
                    {row.term}
                  </span>
                  {row.tag && (
                    <span
                      className={`${plexMono.className} hidden shrink-0 bg-[#0B0B0E] px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-[#FFD400] md:inline`}
                    >
                      {row.tag}
                    </span>
                  )}
                  <span
                    className={`${archivoBlack.className} shrink-0 text-right text-[16px] md:text-[18px]`}
                  >
                    ${row.price}.00
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── TRUST ─────────────── */}
        <section className="relative">
          <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-8">
            <div className="grid grid-cols-1 gap-6 border-2 border-[#0B0B0E] bg-[#FFD400] p-6 md:grid-cols-12 md:p-10">
              <div className="md:col-span-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/70">
                  § V · What Jargon Jar can see
                </div>
                <h3
                  className={`${anton.className} mt-4 text-[36px] uppercase leading-[1] md:mt-6 md:text-[56px]`}
                >
                  <span className="block">We read</span>
                  <span className="mt-1 inline-block bg-[#0B0B0E] px-2 py-[2px] leading-[0.95] text-[#FFD400]">very little.</span>
                </h3>
              </div>
              <ul
                className={`${plexMono.className} md:col-span-7 grid grid-cols-1 gap-2 text-[13px] md:grid-cols-2`}
              >
                {[
                  "Your basic profile (name, avatar)",
                  "Workspace + member list",
                  "Slash-command payloads only",
                  "Charges & disputes you create",
                  "No DM contents. Ever.",
                  "No channel-message reading",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-[7px] inline-block h-[6px] w-[6px] bg-[#0B0B0E]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─────────────── CLOSING CTA ─────────────── */}
        <section className="relative border-t-2 border-[#0B0B0E] bg-[#F2ECD9]">
          <div className="mx-auto max-w-[1200px] px-5 py-20 text-center md:px-8 md:py-28">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
              § VI · Final notice
            </div>
            <h2
              className={`${anton.className} mx-auto mt-3 max-w-[20ch] text-[56px] uppercase leading-[0.88] tracking-[-0.01em] sm:text-[80px] md:text-[140px]`}
            >
              Stop letting <span className="relative inline-block"><span className="relative z-10 text-[#DC2626]">synergy</span><span aria-hidden className="absolute left-0 right-0 top-[48%] z-20 h-[6px] -rotate-[2deg] bg-[#DC2626]" /></span> happen for free.
            </h2>

            <div className="mt-10 inline-flex flex-col items-center gap-5">
              <a
                href="/api/slack/install"
                className="group relative inline-flex items-center gap-3 bg-[#0B0B0E] px-8 py-5 text-[#F2ECD9] shadow-[8px_8px_0_0_#FFD400] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[12px_12px_0_0_#FFD400]"
              >
                <SlackGlyph className="h-5 w-5" />
                <span
                  className={`${archivoBlack.className} text-[16px] uppercase tracking-[0.14em]`}
                >
                  Add to Slack
                </span>
              </a>
              <a
                href="/api/auth/signin"
                className={`${plexMono.className} text-[12px] uppercase tracking-[0.18em] underline decoration-1 underline-offset-[6px] hover:text-[#DC2626]`}
              >
                or sign in to an existing jar →
              </a>
            </div>
          </div>
        </section>

        {/* ─────────────── FOOTER ─────────────── */}
        <footer className="border-t-2 border-[#0B0B0E]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <div
              className={`${plexMono.className} text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60`}
            >
              © {new Date().getFullYear()} Jargon Jar · Dept. of Fines
            </div>
            <div
              className={`${plexMono.className} flex gap-4 text-[11px] uppercase tracking-[0.22em]`}
            >
              <a href="#" className="hover:text-[#DC2626]">Privacy</a>
              <a href="#" className="hover:text-[#DC2626]">Terms</a>
              <a href="#" className="hover:text-[#DC2626]">Support</a>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker 60s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
      `}</style>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function Step({
  num,
  title,
  body,
  children,
}: {
  num: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="flex items-baseline gap-4">
        <span
          className="font-[var(--font-archivo-black)] text-[64px] leading-none text-[#0B0B0E]/15 transition-colors group-hover:text-[#DC2626]"
          style={{ fontFamily: "var(--font-archivo-black)" }}
        >
          {num}
        </span>
        <h3
          className="text-[26px] uppercase leading-[0.95] tracking-[-0.005em] md:text-[32px]"
          style={{
            fontFamily: "var(--font-anton)",
          }}
        >
          {title}
        </h3>
      </div>
      <p
        className="mt-3 max-w-[40ch] text-[13px] leading-[1.6] text-[#0B0B0E]/75"
        style={{ fontFamily: "var(--font-plex-mono)" }}
      >
        {body}
      </p>
      {children}
    </div>
  );
}

function SlackGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 122.8 122.8"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M25.8 77.6a12.9 12.9 0 11-12.9-12.9h12.9v12.9zm6.5 0a12.9 12.9 0 0125.8 0v32.3a12.9 12.9 0 11-25.8 0V77.6z" fill="#E01E5A"/>
      <path d="M45.2 25.8a12.9 12.9 0 1112.9-12.9v12.9H45.2zm0 6.5a12.9 12.9 0 010 25.8H12.9a12.9 12.9 0 110-25.8h32.3z" fill="#36C5F0"/>
      <path d="M97 45.2a12.9 12.9 0 1112.9 12.9H97V45.2zm-6.5 0a12.9 12.9 0 11-25.8 0V12.9a12.9 12.9 0 1125.8 0v32.3z" fill="#2EB67D"/>
      <path d="M77.6 97a12.9 12.9 0 11-12.9 12.9V97h12.9zm0-6.5a12.9 12.9 0 010-25.8h32.3a12.9 12.9 0 110 25.8H77.6z" fill="#ECB22E"/>
    </svg>
  );
}

function CitationPost() {
  return (
    <div className="relative md:pl-6">
      {/* light Slack cue: the bot dropped this into the channel */}
      <div className="flex items-center gap-2.5 pb-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-[#FFD400]">
          <span className={`${archivoBlack.className} text-[13px] text-[#0B0B0E]`}>
            $
          </span>
        </span>
        <span className="text-[13px] font-semibold text-[#F2ECD9]">Jargon Jar</span>
        <span className="rounded bg-[#F2ECD9]/10 px-1.5 py-[1px] text-[10px] uppercase tracking-[0.14em] text-[#F2ECD9]/60">
          app
        </span>
        <span className={`${plexMono.className} text-[11px] text-[#F2ECD9]/40`}>
          posted to #general
        </span>
      </div>

      {/* the citation — the artifact, full glory */}
      <article className="relative rotate-[-1.2deg] border-2 border-[#0B0B0E] bg-[#F2ECD9] p-6 text-[#0B0B0E] shadow-[12px_12px_0_0_#FFD400] md:p-8">
        {/* FINED stamp */}
        <div
          aria-hidden
          className="absolute -right-3 -top-5 z-[3] rotate-[12deg] border-[3px] border-[#DC2626] bg-[#F2ECD9] px-3 py-1 shadow-[3px_3px_0_0_rgba(11,11,14,0.25)]"
        >
          <div
            className={`${archivoBlack.className} text-[22px] leading-none tracking-[0.06em] text-[#DC2626] md:text-[26px]`}
          >
            FINED
          </div>
          <div
            className={`${plexMono.className} text-center text-[8px] uppercase tracking-[0.22em] text-[#DC2626] md:text-[9px]`}
          >
            EST. 2024
          </div>
        </div>

        {/* header */}
        <div className="flex items-end justify-between gap-3 border-b-2 border-[#0B0B0E] pb-4">
          <div>
            <div
              className={`${plexMono.className} text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55`}
            >
              Citation
            </div>
            <div
              className={`${archivoBlack.className} mt-1 text-[22px] uppercase leading-none tracking-[0.04em] md:text-[26px]`}
            >
              Issued
            </div>
          </div>
          <div className="text-right">
            <div
              className={`${plexMono.className} text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55`}
            >
              Citation no.
            </div>
            <div className={`${plexMono.className} mt-1 text-[14px] tracking-[0.05em]`}>
              #00042AF3
            </div>
          </div>
        </div>

        {/* details */}
        <dl className="mt-5 space-y-3">
          <CitationRow label="Offender" value="Riley" />
          <CitationRow label="Issuing officer" value="Adam" />
          <CitationRow label="Workspace" value="Acme" />
        </dl>

        <div className="my-6 border-t border-dashed border-[#0B0B0E]/40" />

        {/* the charge */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div
              className={`${plexMono.className} text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55`}
            >
              Charge
            </div>
            <div className="mt-2 truncate text-[18px] italic text-[#0B0B0E]/90">
              &quot;synergy&quot;
            </div>
          </div>
          <div className={`${archivoBlack.className} shrink-0 text-[44px] leading-none md:text-[52px]`}>
            $5.00
          </div>
        </div>

        <div className="my-6 border-t border-dashed border-[#0B0B0E]/40" />

        {/* total */}
        <div className="flex items-baseline justify-between gap-3">
          <div
            className={`${plexMono.className} text-[11px] uppercase tracking-[0.22em] text-[#DC2626]`}
          >
            Total due
          </div>
          <div className={`${archivoBlack.className} text-[24px] text-[#DC2626] md:text-[28px]`}>
            $5.00
          </div>
        </div>

        {/* filed */}
        <div
          className={`${plexMono.className} mt-7 border-t border-dotted border-[#0B0B0E]/40 pt-4 text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55`}
        >
          Filed Jun 20, 11:42 AM
        </div>
      </article>

      {/* Slack actions below the receipt — the two real buttons */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="rounded border border-[#FFD400]/60 bg-[#FFD400]/15 px-3.5 py-2 text-[12px] text-[#FFD400] hover:bg-[#FFD400]/25">
          View receipt
        </button>
        <button className="rounded border border-[#F2ECD9]/20 px-3.5 py-2 text-[12px] text-[#F2ECD9]/70 hover:bg-[#F2ECD9]/10">
          View leaderboard
        </button>
        <span className={`${plexMono.className} text-[11px] text-[#F2ECD9]/40`}>
          Running total for Riley: <span className="text-[#F2ECD9]/75">$47.00</span>
        </span>
      </div>
    </div>
  );
}

function CitationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-[#0B0B0E]/30 pb-2">
      <dt className={`${plexMono.className} text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55`}>
        {label}
      </dt>
      <dd className={`${archivoBlack.className} text-[14px] uppercase tracking-[0.04em]`}>
        {value}
      </dd>
    </div>
  );
}
