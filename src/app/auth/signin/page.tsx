'use client'

import { Button } from '@/components/ui/button'

export default function SignIn() {
  const handleSlackSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/slack/callback`
    const scopes = [
      'identity.basic',
      'identity.email',
      'identity.avatar',
      'identity.team',
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

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = slackAuthUrl
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">Sign In to Jargon Jar</h1>
      <Button onClick={handleSlackSignIn}>
        Sign In with Slack
      </Button>
    </div>
  )
} 