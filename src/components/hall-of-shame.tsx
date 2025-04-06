import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrophyIcon } from "lucide-react"

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
  // Find the top user with the highest charges
  const topUser = topUsers.length > 0 
    ? topUsers.reduce((max, user) => max.total_charges > user.total_charges ? max : user) 
    : null;
  
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
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jargon charges yet</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Top jargon offenders in your workspace
              </p>
              
              <ul className="space-y-2">
                {topUsers.map(user => (
                  <li key={user.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.display_name} 
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <span>{user.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span>{user.display_name}</span>
                    </div>
                    <span className="font-semibold">${user.total_charges.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              
              {topUser && (
                <p className="text-xs text-muted-foreground italic mt-4">
                  Maybe we need a jargon intervention for {topUser.display_name}...
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 