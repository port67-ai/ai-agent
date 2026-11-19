import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple middleware to allow all requests since auth is handled client-side
// and we've removed Clerk
export function middleware(request: NextRequest) {
    return NextResponse.next()
}

// /api/factory is excluded: this middleware does nothing for it, and a matching middleware makes Next.js buffer request
// bodies and cut them at 10 MB, which would truncate Studio uploads (CHG-0097).
export const config = {
    matcher: [
        '/((?!_next|api/factory|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
