import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { securityHeaders } from "@/server/middleware/security-headers";

export function middleware(request: NextRequest) {
  const response = NextResponse.next(request);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  if (process.env.NODE_ENV !== "production") {
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};


