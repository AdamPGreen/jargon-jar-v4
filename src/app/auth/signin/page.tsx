'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  // Log environment variables on the client-side
  console.log('Client-side NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Client-side NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = createClient();

  const handleSlackSignIn = async () => {
    console.log('Attempting sign in with: slack_oidc'); // Update log
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'slack_oidc', // *** TRY THIS KEY INSTEAD ***
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error signing in with Slack:', error)
    }
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