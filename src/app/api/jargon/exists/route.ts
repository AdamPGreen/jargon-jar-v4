import { NextResponse } from 'next/server'
import { assertWorkspaceAccess, requireApiSession } from '@/lib/auth/guards'
import { findJargonTerm } from '@/lib/db/queries'

export async function GET(request: Request) {
  // Extract query parameters
  const url = new URL(request.url)
  const term = url.searchParams.get('term')
  const workspaceId = url.searchParams.get('workspace_id')

  if (!term || !workspaceId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  const { error, session } = await requireApiSession()
  if (error) return error

  const accessError = assertWorkspaceAccess(session.workspaceId, workspaceId)
  if (accessError) return accessError

  try {
    const data = await findJargonTerm({ workspaceId, term })

    if (!data) return NextResponse.json({ exists: false })

    return NextResponse.json({
      exists: true,
      id: data.id,
      term: data.term, 
      description: data.description,
      default_cost: data.defaultCost
    })
  } catch (e) {
    console.error('Error checking if jargon term exists:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 