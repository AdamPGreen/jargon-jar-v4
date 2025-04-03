import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Create Supabase client and response object
  const { supabase, response } = createClient(request)

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  const { data: { session } } = await supabase.auth.getSession()

  // Define public paths
  const publicPaths = ['/sign-in', '/api/auth/slack/callback'] // Add other public paths if needed

  // Check if the user is trying to access a protected route without a session
  if (!session && pathname.startsWith('/dashboard')) {
    // Redirect to sign-in page if not authenticated and accessing dashboard
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    redirectUrl.searchParams.set('next', pathname) // Optionally store intended path
    return NextResponse.redirect(redirectUrl)
  }

  // If user is logged in and tries to access sign-in page, redirect to dashboard
  if (session && pathname === '/sign-in') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.searchParams.delete('next') // Clear any 'next' param
    return NextResponse.redirect(redirectUrl)
  }

  // Continue with the response (session refreshed)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/slack (Slack API endpoints, handled separately)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/slack|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/dashboard/:path*', // Specifically match dashboard routes
    '/sign-in', // Match the sign-in page
  ],
} 