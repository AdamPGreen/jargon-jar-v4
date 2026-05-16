import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_SESSION_COOKIE = 'jargon_jar_session'

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const hasSessionCookie = Boolean(request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value)

  if (isProtectedRoute && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
} 