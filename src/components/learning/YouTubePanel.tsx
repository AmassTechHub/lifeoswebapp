"use client";

import { useState } from "react";
import { ExternalLink, Loader2, PlayCircle, Search, Trash2, X, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1].split("?")[0];
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
    }
  } catch { /* not a valid url */ }
  return null;
}

type SavedVideo = { id: string; title: string; videoId: string };
type SearchResult = { videoId: string; title: string; channel: string; thumbnail: string };

export function YouTubePanel({ courseId }: { courseId: string }) {
  const storageKey = `yt-videos-${courseId}`;

  const [saved, setSaved] = useState<SavedVideo[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });

  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(saved[0]?.videoId ?? null);
  const [addError, setAddError] = useState("");

  function persist(next: SavedVideo[]) {
    setSaved(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function addVideo(videoId: string, title: string) {
    if (saved.find((v) => v.videoId === videoId)) {
      setActiveId(videoId);
      setSearchResults([]);
      setSearchQuery("");
      return;
    }
    const entry: SavedVideo = { id: Date.now().toString(), title, videoId };
    const next = [entry, ...saved];
    persist(next);
    setActiveId(videoId);
    setSearchResults([]);
    setSearchQuery("");
  }

  function handleAddByUrl() {
    setAddError("");
    const videoId = extractVideoId(urlInput.trim());
    if (!videoId) {
      setAddError("Invalid YouTube URL. Try: https://www.youtube.com/watch?v=...");
      return;
    }
    addVideo(videoId, titleInput.trim() || `Video ${saved.length + 1}`);
    setUrlInput("");
    setTitleInput("");
  }

  function handleDelete(id: string) {
    const next = saved.filter((v) => v.id !== id);
    persist(next);
    if (activeId && saved.find((v) => v.id === id)?.videoId === activeId) {
      setActiveId(next[0]?.videoId ?? null);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.error === "no_key") {
        setSearchError("Add YOUTUBE_API_KEY to your environment variables to enable in-app search.");
      } else if (data.error) {
        setSearchError(data.error);
      } else {
        setSearchResults(data.results ?? []);
        if ((data.results ?? []).length === 0) setSearchError("No results found.");
      }
    } catch {
      setSearchError("Network error. Check your connection.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search YouTube…"
            className="h-9 w-full rounded-xl border border-border/60 bg-muted/30 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent/15"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!searchQuery.trim() || searching}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground disabled:opacity-40"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4 text-red-500" />}
          Search
        </button>
      </div>

      {/* Search results */}
      {(searchResults.length > 0 || searchError) && (
        <div className="rounded-xl border border-border/60 bg-muted/10">
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Results for &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => { setSearchResults([]); setSearchError(""); setSearchQuery(""); }}
              className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {searchError ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">{searchError}</p>
          ) : (
            <div className="divide-y divide-border/30">
              {searchResults.map((r) => (
                <button
                  key={r.videoId}
                  type="button"
                  onClick={() => addVideo(r.videoId, r.title)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/5"
                >
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-5 w-5 text-white/80" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{r.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{r.channel}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add by URL */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Paste a URL</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddByUrl()}
            placeholder="https://youtube.com/watch?v=…"
            className="h-8 min-w-0 rounded-lg border border-border/60 bg-background/60 px-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent/15 sm:flex-1"
          />
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 min-w-0 rounded-lg border border-border/60 bg-background/60 px-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent/15 sm:w-36"
          />
          <button
            type="button"
            onClick={handleAddByUrl}
            disabled={!urlInput.trim()}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            Add
          </button>
        </div>
        {addError && <p className="text-xs text-destructive">{addError}</p>}
      </div>

      {/* Video player + saved list */}
      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-12 text-center">
          <Youtube className="mx-auto h-10 w-10 text-red-400/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No videos saved yet</p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Search above or paste a YouTube URL to watch without leaving the app.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          {/* Player */}
          {activeId && (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="relative pb-[56.25%]">
                <iframe
                  key={activeId}
                  src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0`}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs text-muted-foreground truncate">
                  {saved.find((v) => v.videoId === activeId)?.title ?? ""}
                </p>
                <a
                  href={`https://www.youtube.com/watch?v=${activeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  YouTube
                </a>
              </div>
            </div>
          )}

          {/* Saved list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Saved</p>
            {saved.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveId(v.videoId)}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border p-2 text-left transition-colors",
                  v.videoId === activeId
                    ? "border-accent/30 bg-accent/5"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <PlayCircle className="h-5 w-5 text-white/80" />
                  </div>
                </div>
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{v.title}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                  className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
