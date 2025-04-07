import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon } from "lucide-react";
import { formatCurrency, formatCount } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { useJargonFrequencyLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardJargon, TimePeriod } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

interface OverusedTermsLeaderboardProps {
  workspaceId: string;
  timePeriod: TimePeriod;
}

export function OverusedTermsLeaderboard({ workspaceId, timePeriod }: OverusedTermsLeaderboardProps) {
  const { data, isLoading, error } = useJargonFrequencyLeaderboard({ 
    workspaceId, 
    timePeriod 
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <CardTitle className="text-xl font-semibold">
          Most Frequently Used Jargon
        </CardTitle>
        <TrendingUpIcon className="h-5 w-5 text-[#feca11]" />
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="h-[400px] flex items-center justify-center border-t">
            <p className="text-red-500">Failed to load leaderboard data</p>
          </div>
        ) : isLoading ? (
          <LeaderboardSkeleton />
        ) : data.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center border-t">
            <p className="text-muted-foreground">No data available for this time period</p>
          </div>
        ) : (
          <div className="h-[400px] overflow-auto border-t">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Term</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Usage</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.map((jargon, index) => (
                  <JargonRow key={jargon.word_id} jargon={jargon} rank={index + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface JargonRowProps {
  jargon: LeaderboardJargon;
  rank: number;
}

function JargonRow({ jargon, rank }: JargonRowProps) {
  // Medal colors for top 3 ranks
  const rankColors = {
    1: 'text-[#ffd700]', // Gold
    2: 'text-[#c0c0c0]', // Silver
    3: 'text-[#cd7f32]', // Bronze
  };

  return (
    <tr 
      className="hover:bg-muted/50 transition-colors" 
      title={jargon.description || ''}
    >
      <td className="py-3 px-4">
        <span className={cn(
          "font-bold",
          rank <= 3 ? rankColors[rank as 1 | 2 | 3] : ""
        )}>
          {rank}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium italic">"{jargon.word}"</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="font-medium">{formatCount(jargon.usage_count)}</span>
      </td>
      <td className="py-3 px-4 text-right text-muted-foreground">
        {formatCurrency(jargon.total_amount)}
      </td>
    </tr>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="h-[400px] border-t pt-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-[300px]" />
        <Skeleton className="h-4 w-full max-w-[250px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-[300px]" />
        <Skeleton className="h-4 w-full max-w-[250px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-[300px]" />
        <Skeleton className="h-4 w-full max-w-[250px]" />
      </div>
    </div>
  );
} 