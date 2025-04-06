"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrophyIcon } from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LabelList 
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type JargonUser = {
  id: string
  display_name: string
  avatar_url: string | null
  total_charges: number
  jargon_count?: number
  favorite_phrase?: string
  rank?: number
}

interface HallOfShameProps {
  topUsers: JargonUser[]
}

export function HallOfShame({ topUsers }: HallOfShameProps) {
  // Find the top user with the highest charges - This might not be needed anymore depending on final design
  const topUser = topUsers.length > 0 
    ? topUsers.reduce((max, user) => max.total_charges > user.total_charges ? max : user) 
    : null;
  
  // Format charges for display
  const formattedTopUsers = topUsers.map((user, index) => ({
    ...user,
    formatted_charges: `$${user.total_charges.toFixed(2)}`,
    rank: index + 1
  }));

  const getRankMessage = (rank: number, total: number) => {
    if (rank === 1) return "The undisputed champion of corporate speak!";
    if (rank === 2) return "So close to the jargon throne! Keep trying?";
    if (rank <= Math.ceil(total / 2)) return "Mid-tier buzzword offender. Going for promotion?";
    if (rank === total) return "Congratulations on basic communication skills!";
    return "Almost speaking like a normal human!";
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Hall of Shame
        </CardTitle>
        <TrophyIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {formattedTopUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jargon charges yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={formattedTopUsers}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis 
                  dataKey="display_name" 
                  type="category" 
                  axisLine={true} 
                  tickLine={false}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={0} 
                          dy={16} 
                          textAnchor="end" 
                          transform="rotate(-45)"
                          fontSize={12}
                          fill="currentColor"
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  height={60}
                />
                <YAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip 
                  wrapperStyle={{ outline: 'none' }}
                  position={{ y: -12 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const user = payload[0].payload as JargonUser & { 
                        formatted_charges: string, 
                        rank: number 
                      };
                      
                      return (
                        <div 
                          className="bg-white rounded-lg border border-[#e2e8f0] shadow-md p-3 max-w-[250px] animate-in fade-in-50 slide-in-from-bottom-1 duration-200 z-50"
                          style={{ animation: 'fadeIn 150ms ease-out' }}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
                              <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-[#191d22] text-sm">
                              {user.display_name}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="font-medium">
                              Total charged: <span className="font-bold">{user.formatted_charges}</span>
                            </div>
                            {user.jargon_count !== undefined && (
                              <div>
                                Jargon count: <span className="font-medium">{user.jargon_count} uses</span>
                              </div>
                            )}
                            {user.favorite_phrase && (
                              <div>
                                Favorite phrase: <span className="italic">"{user.favorite_phrase}"</span>
                              </div>
                            )}
                          </div>
                          
                          <div className={cn(
                            "mt-2 text-sm",
                            user.rank === 1 ? "text-[#FF5533] font-medium" : "text-gray-600"
                          )}>
                            {getRankMessage(user.rank, formattedTopUsers.length)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total_charges" 
                  fill="#FDDB3E" 
                  radius={[4, 4, 0, 0]}
                  activeBar={{ fill: '#ffe56d' }}
                >
                  <LabelList 
                    dataKey="formatted_charges" 
                    position="top" 
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 