"use client"

export default function SignIn() {
  const handleSlackSignIn = () => {
    window.location.href = "/api/auth/signin"
  }

  return (
    <div className="relative min-h-screen bg-[#F2ECD9] text-[#0B0B0E]">
      <div
        aria-hidden
        className="bg-paper-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
      />
      <div className="relative z-[2] flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-[420px] border-2 border-[#0B0B0E] bg-[#F2ECD9] receipt-shadow-lg">
          <div className="border-b-2 border-[#0B0B0E] px-6 py-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
              § 0 · Identification
            </div>
            <h1 className="font-heading mt-1 text-[28px] uppercase leading-[0.95] tracking-[-0.005em]">
              Sign in
            </h1>
          </div>
          <div className="px-6 py-6">
            <p className="text-[13px] leading-[1.6] text-[#0B0B0E]/75">
              Your Slack identity is your badge. We don't issue separate passwords.
            </p>
            <button
              type="button"
              onClick={handleSlackSignIn}
              className="font-stamp mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#0B0B0E] px-5 py-4 text-[13px] uppercase tracking-[0.14em] text-[#F2ECD9] shadow-[6px_6px_0_0_#FFD400] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]"
            >
              Sign in with Slack
            </button>
            <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
              Not installed yet? Visit the homepage to add to Slack.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
