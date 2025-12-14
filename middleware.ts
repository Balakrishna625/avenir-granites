import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/whatsapp/webhook'];

export async function middleware(request: NextRequest) {
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
  console.log('🍪 Middleware - Path:', pathname, '| Token found:', token ? 'YES' : 'NO');

  if (!token) {
    console.log('🚫 No token, redirecting to login');
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token using jose (Edge-compatible)
    const { payload } = await jwtVerify(token, secret);
    console.log('✅ Token valid for:', payload.username, '| Allowing access to:', pathname);
    
    // Create response and pass through
    const response = NextResponse.next();
    
    // Re-set the cookie to ensure it persists (refresh the cookie)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.log('❌ Invalid token, redirecting to login. Error:', error instanceof Error ? error.message : 'Unknown error');
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    
    // Clear invalid token
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
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
