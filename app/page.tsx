"use client"
import { useState, useCallback, useEffect } from "react";
import { Copy, Check, Link2, Trash2, ExternalLink, BarChart2, Clock, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ShortenedLink = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: Date;
  clicks: number;
};

type SupabaseUrl = {
  id: string;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
};

function mapLink(row: SupabaseUrl): ShortenedLink {
  return {
    id: row.id,
    originalUrl: row.original_url,
    shortCode: row.short_code,
    shortUrl: `https://${DOMAIN}/${row.short_code}`,
    createdAt: new Date(row.created_at),
    clicks: row.clicks,
  };
}

const DOMAIN = "lnk.sh";

function generateCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatTime(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(url: string, max = 52): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

export default function App() {
  const [inputUrl, setInputUrl] = useState("");
  const [links, setLinks] = useState<ShortenedLink[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [latestId, setLatestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidUrl = (val: string) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleShorten = useCallback(async () => {
  const trimmed = inputUrl.trim();

  if (!trimmed) {
    setError("Enter a URL to shorten.");
    return;
  }

  if (!isValidUrl(trimmed)) {
    setError("Please enter a valid URL (include https://).");
    return;
  }

  setError("");
  setLoading(true);

  try {
    await new Promise((r) => setTimeout(r, 600));

    const code = generateCode();

    const { data, error } = await supabase
      .from("urls")
      .insert({
        original_url: trimmed,
        short_code: code,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const newLink = mapLink(data);

    setLinks((prev) => [newLink, ...prev]);
    setLatestId(newLink.id);
    setInputUrl("");
  } catch (error) {
    console.error(error);
    setError("Failed to create short URL.");
  } finally {
    setLoading(false);
  }
}, [inputUrl]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (latestId === id) setLatestId(null);
  }, [latestId]);

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const latest = links.find((l) => l.id === latestId);

useEffect(() => {
  let cancelled = false;

  async function fetchLinks() {
    const { data, error } = await supabase
      .from("urls")
      .select("*")
      .order("created_at", { ascending: false });

    if (cancelled) return;

    if (error) {
      setError(error.message);
      return;
    }

    setLinks((data ?? []).map(mapLink));
  }

  fetchLinks();

  return () => {
    cancelled = true;
  };
}, []);

  return (
    <div
      className="min-h-screen w-full bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-primary flex items-center justify-center">
            <Link2 size={11} className="text-background" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-foreground">
            {DOMAIN}
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="hidden md:flex items-center gap-1.5">
            <BarChart2 size={11} className="text-primary" />
            {links.length} links
          </span>
          <span className="hidden md:flex items-center gap-1.5">
            <Zap size={11} className="text-primary" />
            {totalClicks} clicks
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-0">
        <div className="w-full max-w-2xl space-y-10">

          {/* Hero label */}
          <div className="space-y-2">
            <p className="text-xs tracking-[0.25em] uppercase text-primary font-medium">
              URL Shortener
            </p>
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              Compress.<br />
              <span className="text-primary">Share.</span>
            </h1>
          </div>

          {/* Input area */}
          <div className="space-y-3">
            <div
              className="flex items-stretch border border-border bg-card transition-all duration-200 focus-within:border-primary/60"
            >
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => { setInputUrl(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleShorten()}
                placeholder="https://your-very-long-url.com/goes/here"
                className="flex-1 bg-transparent px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                onClick={handleShorten}
                disabled={loading}
                className="px-6 py-4 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-[#c8ff5a] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-background/40 border-t-background rounded-full animate-spin" />
                    Shortening
                  </span>
                ) : "Shorten →"}
              </button>
            </div>

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-destructive inline-block" />
                {error}
              </p>
            )}
          </div>

          {/* Latest result spotlight */}
          {latest && (
            <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                ✓ Shortened
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-lg font-bold text-primary tracking-tight">
                    {latest.shortUrl}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {truncate(latest.originalUrl)}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(latest.shortUrl, latest.id + "-hero")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-[#c8ff5a] active:scale-[0.98] transition-all duration-150 shrink-0"
                >
                  {copied === latest.id + "-hero" ? (
                    <><Check size={12} strokeWidth={3} /> Copied</>
                  ) : (
                    <><Copy size={12} strokeWidth={2.5} /> Copy</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* History panel */}
      {links.length > 0 && (
        <section className="border-t border-border px-4 pb-8 pt-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
                Recent Links — {links.length}
              </p>
              <button
                onClick={() => { setLinks([]); setLatestId(null); }}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors duration-150"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-0 divide-y divide-border">
              {links.map((link) => (
                <div
                  key={link.id}
                  className={`flex items-center gap-3 py-3 group transition-colors duration-100 ${link.id === latestId ? "bg-primary/[0.04]" : ""}`}
                >
                  {/* Short URL */}
                  <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-4 items-center">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {DOMAIN}/{link.shortCode}
                    </span>
                    <span className="text-xs text-muted-foreground truncate hidden md:block">
                      {truncate(link.originalUrl, 48)}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock size={9} />
                    {formatTime(link.createdAt)}
                  </div>
                  <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 w-14 text-right">
                    <BarChart2 size={9} />
                    {link.clicks}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(link.shortUrl, link.id)}
                      title="Copy link"
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors duration-150"
                    >
                      {copied === link.id ? (
                        <Check size={13} strokeWidth={3} className="text-primary" />
                      ) : (
                        <Copy size={13} strokeWidth={2} />
                      )}
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open short URL"
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
                    >
                      <ExternalLink size={13} strokeWidth={2} />
                    </a>
                    <button
                      onClick={() => handleDelete(link.id)}
                      title="Delete"
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors duration-150"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
