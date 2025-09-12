import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('authToken') || localStorage.getItem('authToken');

    // Eğer token yoksa ve dashboard sayfasına erişmeye çalışıyorsa login'e yönlendir
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Eğer token varsa ve login sayfasına erişmeye çalışıyorsa dashboard'a yönlendir
    if (token && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};