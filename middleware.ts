import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/login-success', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🛡️ Middleware checking path:', pathname);

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    console.log('✅ Public path allowed:', pathname);
    return NextResponse.next();
  }

  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;
  console.log('🍪 Token found:', token ? 'YES' : 'NO');

  if (!token) {
    console.log('🚫 No token, redirecting to login');
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    jwt.verify(token, JWT_SECRET);
    console.log('✅ Token valid, allowing access to:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.log('❌ Invalid token, redirecting to login');
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    
    // Clear invalid token
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Match other cookie settings
      maxAge: 0,
      path: '/' // Explicitly set path
    });
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
