"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="px-4 py-2 border rounded-md"
    >
      Sign in with Google
    </button>
  );
}