import Image from "next/image"
import { format } from "date-fns"
import { requireDashboardContext } from "@/lib/auth/guards"

export default async function ProfilePage() {
  const { member, workspace, session } = await requireDashboardContext()

  const memberSince = format(new Date(member.createdAt), "MMM d, yyyy")

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 border-b-2 border-[#0B0B0E] pb-5 md:flex-row md:items-end">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
            § VII · On file
          </div>
          <h1 className="font-heading mt-2 text-[44px] uppercase leading-[0.9] tracking-[-0.005em] md:text-[64px]">
            Your <span className="text-[#DC2626]">record.</span>
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] text-[#0B0B0E]/75">
            Identity on file for the Dept. of Fines. Pulled straight from Slack.
          </p>
        </div>
      </div>

      <section className="border-2 border-[#0B0B0E] bg-white receipt-shadow">
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0E] px-4 py-3">
          <div className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
            § VII-a · Identification
          </div>
          <span className="font-stamp bg-[#0B0B0E] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-[#FFD400]">
            Member
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[auto_1fr] md:gap-8">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden border-2 border-[#0B0B0E] bg-[#FFD400]">
            {member.avatarUrl ? (
              <Image
                src={member.avatarUrl}
                alt={member.displayName}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-stamp text-[28px] uppercase text-[#0B0B0E]">
                {initials(member.displayName)}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Display name" value={member.displayName} />
            <Field label="Email" value={member.email ?? "Not on file."} />
            <Field label="Workspace" value={workspace.name} />
            <Field label="Slack user id" value={session.slackUserId} mono />
            <Field label="Member since" value={memberSince} />
            <Field
              label="Role"
              value={member.isAdmin ? "Admin" : "Member"}
            />
          </dl>
        </div>
      </section>

      <section className="border-2 border-[#0B0B0E] bg-white receipt-shadow">
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0E] px-4 py-3">
          <div className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
            § VII-b · Permissions
          </div>
          <span className="font-stamp bg-[#FFD400] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-[#0B0B0E]">
            All clear
          </span>
        </div>
        <ul className="grid grid-cols-1 px-4 py-2">
          <Perm text="Issue citations in any channel." />
          <Perm text="Edit the workspace rate sheet." />
          <Perm text="View the leaderboard and citation log." />
        </ul>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="font-stamp text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-[14px] text-[#0B0B0E] ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function Perm({ text }: { text: string }) {
  return (
    <li className="flex items-baseline gap-3 border-b border-dotted border-[#0B0B0E]/30 py-3 last:border-b-0">
      <span
        aria-hidden
        className="inline-block h-[6px] w-[6px] shrink-0 bg-[#0B0B0E]"
      />
      <span className="text-[13px] text-[#0B0B0E]/85">{text}</span>
    </li>
  )
}

function initials(name?: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
