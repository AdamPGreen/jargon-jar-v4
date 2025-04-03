import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Middleware Error: Missing Supabase URL or Anon Key')
    return new NextResponse('Internal Server Error: Missing Supabase configuration', { status: 500 })
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request cookies.
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set the cookie on the response.
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request cookies.
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set the cookie on the response.
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // `getSession` can be used instead of `getUser` if needed, but `getUser` is often sufficient
  // and potentially slightly lighter. Let's stick with getSession for consistency with callback.
  const { data: { session }, } = await supabase.auth.getSession()

  // Define protected routes
  const protectedPaths = ['/dashboard'] // Add more paths as needed

  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // If trying to access a protected route without a session, redirect to landing page
  if (isProtectedRoute && !session) {
    console.log('DIAGNOSTIC (Middleware): No session found, redirecting from protected route:', request.nextUrl.pathname)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/' // Redirect to landing page for now
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    // Optionally add a message like: redirectUrl.searchParams.set('error', 'session_required')
    return NextResponse.redirect(redirectUrl)
  }

  // Optional: Redirect logged-in users away from public auth pages (e.g., a dedicated sign-in page)
  // const publicOnlyPaths = ['/signin', '/signup'] // Example paths
  // const isPublicOnlyPath = publicOnlyPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  // if (isPublicOnlyPath && session) {
  //   console.log('DIAGNOSTIC (Middleware): Session found, redirecting from public-only route:', request.nextUrl.pathname)
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }

  console.log('DIAGNOSTIC (Middleware): Allowing request for:', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes, handled separately or intentionally public)
     * - auth/ (Auth routes, callback needs to be accessible)
     * Exclude specific auth routes needed for the flow:
     * - /auth/slack/callback (Bot install callback)
     * - /auth/callback (Supabase auth callback)
     * - /auth/auth-code-error (Error display page)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/slack/callback|api/slack/|auth/callback|auth/auth-code-error).*)',
    /* Explanation of the negative lookahead:
     * (?!...) : Negative lookahead assertion.
     * _next/static|_next/image|favicon.ico : Matches static assets.
     * api/auth/slack/callback : Excludes the specific Slack bot install callback.
     * api/slack/ : Excludes other potential Slack API endpoints like commands/interactions.
     * auth/callback : Excludes the Supabase auth callback route.
     * auth/auth-code-error : Excludes the error page for auth.
     * .* : Matches any character (except newline) zero or more times.
     * This ensures the middleware runs on pages like '/', '/dashboard', etc., but not on the excluded paths.
     */
  ],
} 