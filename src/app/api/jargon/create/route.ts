import { NextResponse } from 'next/server'
import { assertWorkspaceAccess, requireApiSession } from '@/lib/auth/guards'
import { createJargonTerm, findJargonTerm, getWorkspaceMember } from '@/lib/db/queries'

export async function POST(request: Request) {
  try {
    // Parse request body
    const { term, description, default_cost, created_by, workspace_id } = await request.json()
    
    // Validate required fields
    if (!term || !workspace_id || default_cost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: term, default_cost, and workspace_id are required' },
        { status: 400 }
      )
    }

    const { error: authError, session } = await requireApiSession()
    if (authError) return authError

    const accessError = assertWorkspaceAccess(session.workspaceId, workspace_id)
    if (accessError) return accessError

    // Check if the term already exists for this workspace
    const existingTerm = await findJargonTerm({ workspaceId: workspace_id, term })

    if (existingTerm) {
      return NextResponse.json(
        { error: 'Jargon term already exists' },
        { status: 409 }
      )
    }

    const member = await getWorkspaceMember({
      workspaceId: session.workspaceId,
      slackUserId: session.slackUserId,
    })

    // Insert the new jargon term
    const data = await createJargonTerm({
      term,
      description,
      defaultCost: String(default_cost),
      createdById: member?.id ?? created_by ?? null,
      workspaceId: workspace_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Jargon term created successfully',
      term: {
        id: data.id,
        term: data.term,
        description: data.description,
        default_cost: data.defaultCost,
      }
    })
  } catch (e) {
    console.error('Unexpected error creating jargon term:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 