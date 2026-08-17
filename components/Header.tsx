"use client";

import {
  BarChart2,
  Link2,
  LogOut,
  Mail,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapLink } from "@/app/page";
import GoogleLoginButton from "./GoogleLoginButton";

type ShortenedLink = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: Date;
  clicks: number;
};

export const Header = () => {
  const [links, setLinks] = useState<ShortenedLink[]>([]);
  const [user, setUser] = useState<string | null>(null);

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

  useEffect(() => {
    const supabase = createClient();

    const loadLinks = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setLinks([]);
        return;
      }

      setUser(user.email ?? null);

      const { data, error } = await supabase
        .from("urls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch links:", error);
        return;
      }

      setLinks((data ?? []).map(mapLink));
    };

    loadLinks();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user?.email ?? null);

      if (!session?.user) {
        setLinks([]);
        return;
      }

      const { data, error } = await supabase
        .from("urls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch links:", error);
        return;
      }

      setLinks((data ?? []).map(mapLink));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    setUser(null);
    setLinks([]);
  };

  return (
    <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border/20 fixed top-0 z-50 w-full backdrop-blur-xl bg-background/80">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 bg-primary flex items-center justify-center">
          <Link2
            size={11}
            className="text-background"
            strokeWidth={2.5}
          />
        </div>

        <span className="text-sm font-semibold tracking-widest uppercase text-foreground">
          Shin Shortener
        </span>
      </div>

      {user ? (
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="hidden md:flex items-center gap-1.5">
            <BarChart2 size={11} className="text-primary" />
            {links.length} links
          </span>

          <span className="hidden md:flex items-center gap-1.5">
            <Zap size={11} className="text-primary" />
            {totalClicks} clicks
          </span>

          <span className="hidden md:flex items-center gap-1.5">
            <Mail size={11} className="text-primary" />
            {user}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="text-primary"
            title="Logout"
          >
            <LogOut size={13} />
          </button>
        </div>
      ) : (
        <GoogleLoginButton />
      )}
    </header>
  );
};

export default Header;