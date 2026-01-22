import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Generate a nonce for strict CSP if needed in the future, 
    // currently using unsafe-inline/eval for broad compatibility with Next.js/Firebase.
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // CSP Directives
    // Note: 'unsafe-eval' is removed.
    // 'nonce-${nonce}' is added to script-src to allow Next.js to authorize its scripts.
    // 'unsafe-inline' is kept in style-src because we use style attributes (style={{...}}) in React components.
    // Browsers ignore 'unsafe-inline' for scripts if a nonce is present, enforcing strict security for scripts.
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://apis.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com;
    font-src 'self' data: https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src 'self' https://*.firebaseapp.com https://*.firebase.com;
    connect-src 'self' 
      https://identitytoolkit.googleapis.com 
      https://securetoken.googleapis.com 
      https://firebasestorage.googleapis.com 
      https://*.firebaseio.com 
      wss://*.firebaseio.com 
      https://*.firebasedatabase.app 
      wss://*.firebasedatabase.app;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', cspHeader);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Set the CSP header on the response
    response.headers.set('Content-Security-Policy', cspHeader);

    // Set other security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};
