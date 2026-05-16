import { NextResponse } from 'next/server'
import { assertWorkspaceAccess, requireApiSession } from '@/lib/auth/guards'
import { getLedgerRows } from '@/lib/db/queries'
import { aggregateJargonAmountLeaderboard } from '@/lib/ledger/leaderboards'

export async function GET(request: Request) {
  // Get query parameters
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspace_id')
  const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  const timePeriod = url.searchParams.get('time_period') || 'all'
  
  // Validate parameters
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  const { error, session } = await requireApiSession()
  if (error) return error

  const accessError = assertWorkspaceAccess(session.workspaceId, workspaceId)
  if (accessError) return accessError

  try {
    const rows = await getLedgerRows(workspaceId, timePeriod)
    const data = aggregateJargonAmountLeaderboard({ ...rows, limit })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in jargon amount leaderboard API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 