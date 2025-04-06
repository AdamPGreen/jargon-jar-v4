import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrophyIcon } from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
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
                layout="vertical" 
                data={formattedTopUsers}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" hide /> 
                <YAxis 
                  dataKey="display_name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  width={80} // Adjust width as needed for names
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
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
                <Bar dataKey="total_charges" layout="vertical" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  <LabelList 
                    dataKey="formatted_charges" 
                    position="right" 
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