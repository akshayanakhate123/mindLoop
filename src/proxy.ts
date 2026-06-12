import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const supabase = createServerClient(request, response);
  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = pathname === "/" || pathname.startsWith("/auth/callback");
  const isOnboarding = pathname === "/onboarding";

  // Unauthenticated — only allow login + callback
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session) {
    const onboardingDone =
      request.cookies.get("mindloop_onboarding_complete")?.value === "true";

    // Authenticated on login page → route based on onboarding state
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(onboardingDone ? "/home" : "/onboarding", request.url)
      );
    }

    // Authenticated but onboarding not done → send to onboarding
    // (allow /onboarding itself and /auth/callback through)
    if (!onboardingDone && !isOnboarding && !isPublic) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Onboarding already done and trying to visit /onboarding → skip to home
    if (onboardingDone && isOnboarding) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
