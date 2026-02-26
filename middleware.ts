import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Capture token param only on auth callback routes
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  if (isAuthCallback) {
    const token = request.nextUrl.searchParams.get("token");
    if (token && /^[a-zA-Z0-9_-]+$/.test(token)) {
      response.cookies.set("revsignal_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 5,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
