import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/middleware";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const response = NextResponse.redirect(new URL("/home", origin));
    const supabase = createServerClient(request, response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Seed profile row on first Google login
      const user = data.session?.user;
      if (user) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("profiles").insert({
            id:    user.id,
            name:  user.user_metadata?.full_name || "",
            email: user.email || "",
          });
        }
      }
      return response;
    }
  }

  return NextResponse.redirect(new URL("/", origin));
}
