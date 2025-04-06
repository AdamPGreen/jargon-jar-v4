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
  // Find the maximum charge amount to calculate relative bar widths
  const maxCharges = Math.max(...topUsers.map(user => user.total_charges))
  
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
              {topUsers.map((user, index) => (
                <div key={user.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {index < 3 && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full" 
                             style={{ 
                               backgroundColor: index === 0 ? 'hsl(var(--primary))' : 
                                              index === 1 ? 'hsl(var(--primary) / 0.8)' : 
                                              'hsl(var(--primary) / 0.6)'
                             }}>
                          <span className="text-xs font-bold text-white">
                            {index + 1}
                          </span>
                        </div>
                      )}
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.display_name} 
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {user.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium truncate max-w-[120px]" title={user.display_name}>
                        {user.display_name}
                      </span>
                    </div>
                    <span className="text-sm font-medium">${user.total_charges.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(user.total_charges / maxCharges) * 100}%`,
                        backgroundColor: index === 0 ? 'hsl(var(--primary))' : 
                                        index === 1 ? 'hsl(var(--primary) / 0.8)' : 
                                        index === 2 ? 'hsl(var(--primary) / 0.6)' : 
                                        'hsl(var(--primary) / 0.4)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 