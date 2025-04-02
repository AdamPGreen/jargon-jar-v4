import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    console.error('No code provided in callback')
    return NextResponse.redirect(`${origin}/auth/signin?error=No+code+provided`)
  }

  try {
    // Exchange the code for access tokens
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenData.ok) {
      console.error('Error exchanging code for tokens:', tokenData.error)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+exchange+code`)
    }

    // Get workspace info
    const workspaceResponse = await fetch('https://slack.com/api/team.info', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const workspaceData = await workspaceResponse.json()
    if (!workspaceData.ok) {
      console.error('Error getting workspace info:', workspaceData.error)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+get+workspace+info`)
    }

    // Get user info
    const userResponse = await fetch('https://slack.com/api/users.info', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()
    if (!userData.ok) {
      console.error('Error getting user info:', userData.error)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+get+user+info`)
    }

    const supabase = createClient()

    // Create or update workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .upsert({
        slack_id: workspaceData.team.id,
        name: workspaceData.team.name,
        domain: workspaceData.team.domain,
        token: tokenData.access_token,
        bot_token: tokenData.bot_user_token,
      }, {
        onConflict: 'slack_id',
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Error creating/updating workspace:', workspaceError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+create+workspace`)
    }

    // Create or update user
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        slack_id: userData.user.id,
        email: userData.user.profile.email,
        display_name: userData.user.profile.display_name || userData.user.profile.real_name,
        avatar_url: userData.user.profile.image_512,
        workspace_id: workspace.id,
      }, {
        onConflict: 'slack_id',
      })

    if (userError) {
      console.error('Error creating/updating user:', userError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+create+user`)
    }

    // Exchange code for session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+create+session`)
    }

    // Success! Redirect to home page
    return NextResponse.redirect(origin)
  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.redirect(`${origin}/auth/signin?error=Internal+server+error`)
  }
} 