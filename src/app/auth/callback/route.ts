import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Successfully exchanged code for session, redirect to home page
      return NextResponse.redirect(origin)
    }
     console.error('Error exchanging code for session:', error)
  }

  // URL does not contain code, or there was an error, redirect to sign-in page with error message
  // TODO: Add better error handling/messaging
  return NextResponse.redirect(`${origin}/auth/signin?error=Could+not+authenticate+user`)
} 