import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatCount } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserAmountLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardUser } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

interface TopSpendersLeaderboardProps {
  workspaceId: string;
  timePeriod: 'all' | 'month' | 'week';
}

export function TopSpendersLeaderboard({ workspaceId, timePeriod }: TopSpendersLeaderboardProps) {
  const { data, isLoading, error } = useUserAmountLeaderboard({ 
    workspaceId, 
    timePeriod 
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">
          Top Spenders
        </CardTitle>
        <TrophyIcon className="h-5 w-5 text-[#feca11]" />
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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Charges</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user, index) => (
                  <UserRow key={user.user_id} user={user} rank={index + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UserRowProps {
  user: LeaderboardUser;
  rank: number;
}

function UserRow({ user, rank }: UserRowProps) {
  // Medal colors for top 3 ranks
  const rankColors = {
    1: 'text-[#ffd700]', // Gold
    2: 'text-[#c0c0c0]', // Silver
    3: 'text-[#cd7f32]', // Bronze
  };
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <span className={cn(
          "font-bold",
          rank <= 3 ? rankColors[rank as 1 | 2 | 3] : ""
        )}>
          {rank}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.image_url || undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="font-medium">{formatCurrency(user.total_amount)}</span>
      </td>
      <td className="py-3 px-4 text-right text-muted-foreground">
        {formatCount(user.charge_count)}
      </td>
    </tr>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="h-[400px] border-t pt-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[160px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[160px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[160px]" />
        </div>
      </div>
    </div>
  );
} 