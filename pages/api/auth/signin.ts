import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.SLACK_CLIENT_ID
  }&scope=identity.basic,identity.email&redirect_uri=${encodeURIComponent(redirectUri)}`
  
  res.redirect(slackAuthUrl)
} 