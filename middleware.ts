import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Generate a nonce for strict CSP if needed in the future, 
    // currently using unsafe-inline/eval for broad compatibility with Next.js/Firebase.
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // CSP Directives
    // Note: 'unsafe-eval' and 'unsafe-inline' are currently enabled.
    // Ideally, these should be removed in favor of nonces in a strict production environment.
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://apis.google.com;
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
