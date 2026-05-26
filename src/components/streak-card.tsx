interface StreakCardProps {
  currentStreak: number
  recordStreak: number
}

const messagesForZeroDays = [
  "Busted. Back to day zero.",
  "Oof. Jargon Jar got you.",
  "Zero days. Try again.",
  "The buzzword got loose.",
]
const subMessagesForZeroDays = [
  "You can do better.",
  "Shake it off.",
  "Was it worth it?",
  "Don't let synergy win.",
]
const messagesForOneDay = ["One day clean", "First day down", "Day one"]
const subMessagesForOneDay = ["Good start.", "Keep it up.", "Nice one."]
const messagesForMultipleDays = ["Days without jargon", "Days clean", "Going strong"]
const subMessagesForMultipleDays = ["Impressive.", "On a roll.", "Making progress."]
const messagesForLongStreak = ["Jargon ninja", "Buzzword dodger", "Untouchable", "Unstoppable"]
const subMessagesForLongStreak = [
  "Legendary streak.",
  "You're mastering the art.",
  "Can anyone stop you?",
]

function pick(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

export function StreakCard({ currentStreak, recordStreak }: StreakCardProps) {
  let title: string
  let sub: string
  const isNewRecord = currentStreak >= recordStreak && currentStreak > 0

  if (currentStreak === 0) {
    title = pick(messagesForZeroDays)
    sub = pick(subMessagesForZeroDays)
  } else if (currentStreak === 1) {
    title = pick(messagesForOneDay)
    sub = pick(subMessagesForOneDay)
  } else if (currentStreak >= 10) {
    title = pick(messagesForLongStreak)
    sub = pick(subMessagesForLongStreak)
  } else {
    title = pick(messagesForMultipleDays)
    sub = pick(subMessagesForMultipleDays)
  }

  return (
    <div className="relative flex flex-col border-2 border-[#0B0B0E] bg-white receipt-shadow">
      <div className="flex items-center justify-between border-b border-dashed border-[#0B0B0E]/40 px-4 py-2">
        <span className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
          Streak
        </span>
        <span className="font-stamp bg-[#0B0B0E] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-[#FFD400]">
          Clean count
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        {isNewRecord && (
          <span className="font-stamp absolute right-3 top-3 rotate-[8deg] border-2 border-[#DC2626] px-2 py-[2px] text-[10px] uppercase tracking-[0.18em] text-[#DC2626]">
            New record
          </span>
        )}
        <div className="font-heading text-[88px] leading-[0.9] text-[#0B0B0E] md:text-[112px]">
          {currentStreak}
        </div>
        <p className="font-stamp mt-1 text-center text-[14px] uppercase tracking-[0.14em]">
          {title}
        </p>
        <p className="mt-1 text-center text-[12px] text-[#0B0B0E]/70">{sub}</p>
      </div>

      <div className="border-t border-dashed border-[#0B0B0E]/40 px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
        Personal record · {recordStreak} day{recordStreak === 1 ? "" : "s"}
      </div>
    </div>
  )
}
