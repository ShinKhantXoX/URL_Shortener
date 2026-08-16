"use client"
import { BarChart2, Link2, LogOut, Mail, Zap } from "lucide-react"
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

    const supabase = createClient();

    const [links, setLinks] = useState<ShortenedLink[]>([]);
    const [user, setUser] = useState<string | null>("");

    const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("session", session)
            setUser(session?.user?.email ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
        }, []);

        useEffect(() => {
    let cancelled = false;

    async function fetchLinks() {
        const { data } = await supabase
        .from("urls")
        .select("*")
        .order("created_at", { ascending: false });

        if (cancelled) return;

        setLinks((data ?? []).map(mapLink));
    }

    fetchLinks();

    return () => {
        cancelled = true;
    };
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();

        await supabase.auth.signOut();

        window.location.reload();
    };


    return (
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-primary flex items-center justify-center">
            <Link2 size={11} className="text-background" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-foreground">
            Shin Shortener
          </span>
        </div>
        {user ? (        <div className="flex items-center gap-6 text-xs text-muted-foreground">
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
          <span className="hidden md:flex items-center gap-1.5">
            <LogOut onClick={handleLogout} size={11} className="text-primary" />
          </span>
        </div>) : (
            <GoogleLoginButton />
        )}
      </header>
    )
}