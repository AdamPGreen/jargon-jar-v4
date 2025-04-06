import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrophyIcon } from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  XAxisProps,
  YAxisProps,
  TooltipProps
} from 'recharts'

type JargonUser = {
  id: string
  display_name: string
  avatar_url: string | null
  total_charges: number
}

interface HallOfShameProps {
  topUsers: JargonUser[]
}

// Define types for chart data
interface ChartDataItem {
  name: string
  charges: number
  avatar: string | null
  id: string
}

// Define types for custom components
interface CustomXAxisTickProps {
  x: number
  y: number
  payload: {
    value: string
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
  }>
  label?: string
}

export function HallOfShame({ topUsers }: HallOfShameProps) {
  // Find the maximum charge amount to calculate relative bar heights
  const maxCharges = Math.max(...topUsers.map(user => user.total_charges))
  
  // Prepare data for the chart
  const chartData = topUsers.map(user => ({
    name: user.display_name,
    charges: user.total_charges,
    avatar: user.avatar_url,
    id: user.id
  }))
  
  // Custom XAxis tick component to display avatars and names
  const CustomXAxisTick = ({ x, y, payload }: CustomXAxisTickProps) => {
    const user = chartData.find(u => u.name === payload.value)
    
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx="0" cy="0" r="20" fill="#f0f0f0" />
        {user?.avatar ? (
          <image
            x="-20"
            y="-20"
            width="40"
            height="40"
            xlinkHref={user.avatar}
            clipPath="circle(20px at center)"
          />
        ) : (
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontWeight="500"
          >
            {user?.name.charAt(0).toUpperCase()}
          </text>
        )}
        <text
          x="0"
          y="30"
          textAnchor="middle"
          fontSize="14"
          fontWeight="500"
        >
          {user?.name}
        </text>
      </g>
    )
  }
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-md shadow-sm border">
          <p className="font-medium">{label}</p>
          <p className="text-sm">${payload[0].value.toFixed(2)} in jargon charges</p>
        </div>
      )
    }
    return null
  }
  
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
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide={true} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={(props) => <CustomXAxisTick {...props} />} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="charges" 
                      radius={[0, 4, 4, 0]} 
                      animationDuration={1000}
                    >
                      {chartData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}`} 
                          fill={entry.charges === maxCharges ? '#FFD700' : '#FFE55C'} 
                          className="hover:fill-[#FFE55C] transition-colors duration-200"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {topUsers.length > 0 && (
                <p className="text-xs text-muted-foreground italic mt-4">
                  Maybe we need a jargon intervention for {topUsers[0].display_name}...
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 