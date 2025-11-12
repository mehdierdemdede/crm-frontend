import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/hesap", "/onboarding"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    const token = request.cookies.get("authToken")?.value;

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        const nextPath = `${pathname}${request.nextUrl.search}`;

        if (nextPath && nextPath !== "/") {
            loginUrl.searchParams.set("next", nextPath);
        }

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/hesap/:path*", "/onboarding/:path*"],
};
