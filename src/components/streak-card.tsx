import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from 'lucide-react'; // Or your preferred icon library

interface StreakCardProps {
  currentStreak: number;
  recordStreak: number;
}

// Helper function to get random messages
const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

// Message variations
const messagesForZeroDays = [
  "Busted! Back to square one.",
  "Oof. Jargon Jar gotcha.",
  "Zero days... try again?",
  "The jargon monster strikes!",
];

const subMessagesForZeroDays = [
  "C'mon, you can do better!",
  "Shake it off and start fresh.",
  "Was it worth it?",
  "Don't let the buzzwords win.",
];

const messagesForOneDay = [
  "Day Without Jargon!",
  "One day down!",
  "Keepin' it clean!",
];

const subMessagesForOneDay = [
  "Good start!",
  "The journey begins.",
  "Keep it up!",
  "Nice one.",
];

const messagesForMultipleDays = (days: number) => [
  "Days Without Jargon",
  "Days jargon-free!",
  "Going strong!",
];

const subMessagesForMultipleDays = [
  "Impressive!",
  "You're on a roll!",
  "Making progress.",
];

const messagesForLongStreak = (days: number) => [
  "Jargon Ninja!",
  "Corporate BS Dodger!",
  "Clean streak!",
  "Unstoppable!",
];

const subMessagesForLongStreak = [
  "Legendary streak!",
  "You're mastering the art.",
  "Can anyone stop you?",
];

export function StreakCard({ currentStreak, recordStreak }: StreakCardProps) {
  let titleMessage: string;
  let subMessage: string;
  const isNewRecord = currentStreak >= recordStreak && currentStreak > 0; // Check if current streak is the new record

  if (currentStreak === 0) {
    titleMessage = getRandomMessage(messagesForZeroDays);
    subMessage = getRandomMessage(subMessagesForZeroDays);
  } else if (currentStreak === 1) {
    titleMessage = getRandomMessage(messagesForOneDay);
    subMessage = getRandomMessage(subMessagesForOneDay);
  } else if (currentStreak >= 10) {
    titleMessage = getRandomMessage(messagesForLongStreak(currentStreak));
    subMessage = getRandomMessage(subMessagesForLongStreak);
  } else { // 2-9 days
    titleMessage = getRandomMessage(messagesForMultipleDays(currentStreak));
    subMessage = getRandomMessage(subMessagesForMultipleDays);
  }

  return (
    <Card className="col-span-1 shadow-sm"> {/* Adjust col-span as needed */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Jargon-Free Streak
        </CardTitle>
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-4">
        <div className="text-4xl font-bold text-amber-500">{currentStreak}</div>
        <p className="mt-1 text-center text-base text-muted-foreground">{titleMessage}</p>
        <p className="text-xs text-center text-muted-foreground">{subMessage}</p>
        {isNewRecord && (
             <span className="mt-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
               New Record!
             </span>
           )}
        <p className="mt-4 text-xs text-muted-foreground italic">
          Your record: {recordStreak} days
        </p>
      </CardContent>
    </Card>
  );
} 