'use client'

import { Button } from '@/components/ui/button'

export default function SignIn() {
  const handleSlackSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/slack/callback`

    // Define BOT scopes needed for app functionality
    const botScopes = [
      'app_mentions:read',
      'channels:history',
      'chat:write',
      'commands',
      'groups:history',
      'im:write',
      'team:read',
      'users:read',
      'users:read.email'
    ].join(',')

    // Define USER scopes needed for user identification
    const userScopes = [
      'identity.basic',
      'identity.email',
      'identity.avatar',
      'identity.team'
    ].join(',')

    // Construct the Slack OAuth v2 URL for installation
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
    slackAuthUrl.searchParams.append('client_id', clientId || '')
    slackAuthUrl.searchParams.append('scope', botScopes) // Bot scopes go here
    slackAuthUrl.searchParams.append('user_scope', userScopes) // User scopes go here
    slackAuthUrl.searchParams.append('redirect_uri', redirectUri)
    slackAuthUrl.searchParams.append('state', crypto.randomUUID()) // Generate secure state

    // Log the URL for debugging
    console.log('Redirecting to Slack Auth URL:', slackAuthUrl.toString());

    // Redirect user to Slack for authorization
    window.location.href = slackAuthUrl.toString()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">Sign In to Jargon Jar</h1>
      <Button 
        onClick={handleSlackSignIn}
        size="lg"
        className="bg-[#FF5500] hover:bg-[#FF5500]/90 text-white text-base font-bold h-12 px-8"
      >
        Sign In with Slack
      </Button>
    </div>
  )
} 