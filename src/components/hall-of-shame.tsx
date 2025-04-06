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

type JargonUser = {
  id: string
  display_name: string
  avatar_url: string | null
  total_charges: number
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
  const formattedTopUsers = topUsers.map(user => ({
    ...user,
    formatted_charges: `$${user.total_charges.toFixed(2)}`
  }));

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
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                User
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.display_name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Charges
                              </span>
                              <span className="font-bold">
                                {payload[0].payload.formatted_charges}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total_charges" 
                  fill="#ffc96f" 
                  radius={[4, 4, 0, 0]}
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