"use client";

import { FileText, Megaphone, MessageSquare, MessagesSquare, Moon, NotebookPen, Plus, ScrollText, Search, ShieldCheck, Sun, Users, LogOut, LayoutGrid } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useTransitionRouter } from "@/components/motion/TransitionProvider";
import { CommandPalette, type PaletteItem } from "@/components/search/CommandPalette";
import { useLiquidTheme } from "@/components/theme/useLiquidTheme";
import type { Announcement, DocumentItem, Note, SearchHit } from "@/lib/workspace-api";

import { signOut } from "./session";
import { useWorkspace } from "./WorkspaceContext";

const Context = createContext<{ openSearch: () => void } | null>(null);

export function useWorkspaceSearch() {
  const value = useContext(Context);
  if (!value) throw new Error("useWorkspaceSearch must be used inside WorkspaceSearchProvider");
  return value;
}

type Loaded = { documents: DocumentItem[]; notes: Note[]; announcements: Announcement[] };

/*
  The workspace search bar. It looks across pages, documents (names, and the text inside
  them once you type four or more characters), notes and announcements, and also offers
  quick actions. Opens with Ctrl or Cmd + K.
*/
export function WorkspaceSearchProvider({ children }: { children: ReactNode }) {
  const { request, boot } = useWorkspace();
  const { go } = useTransitionRouter();
  const { dark, next, toggle } = useLiquidTheme();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ documents: [], notes: [], announcements: [] });
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const caps = boot?.capabilities;

  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fresh lists every time the bar opens
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.allSettled([
      request<{ documents: DocumentItem[] }>("/documents/"),
      request<{ notes: Note[] }>("/notes/"),
      request<{ announcements: Announcement[] }>("/announcements/"),
    ]).then(([docs, notes, notices]) => {
      if (!live) return;
      setLoaded({
        documents: docs.status === "fulfilled" ? docs.value.documents : [],
        notes: notes.status === "fulfilled" ? notes.value.notes : [],
        announcements: notices.status === "fulfilled" ? notices.value.announcements : [],
      });
    });
    return () => {
      live = false;
    };
  }, [open, request]);

  const onQueryChange = useCallback(
    (query: string) => {
      window.clearTimeout(timer.current);
      if (query.trim().length < 4) {
        setHits([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      timer.current = window.setTimeout(() => {
        request<{ results: SearchHit[] }>(`/documents/?q=${encodeURIComponent(query.trim())}`)
          .then((data) => setHits(data.results))
          .catch(() => setHits([]))
          .finally(() => setSearching(false));
      }, 450);
    },
    [request],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const page = (id: string, label: string, href: string, icon: PaletteItem["icon"], keywords = ""): PaletteItem => ({
      id: `page-${id}`, label, hint: "Page", icon, keywords, perform: () => go(href),
    });
    const list: PaletteItem[] = [
      page("home", "Overview", "/workspace", LayoutGrid, "home dashboard"),
      page("chat", "AI chat", "/workspace/chat", MessageSquare, "ask question assistant"),
      page("team", "Team chat", "/workspace/team", MessagesSquare, "rooms messages"),
      page("documents", "Documents", "/workspace/documents", FileText, "files upload library"),
      page("notes", "Notes", "/workspace/notes", NotebookPen, "scratch"),
      page("announcements", "Announcements", "/workspace/announcements", Megaphone, "notices news"),
    ];
    if (caps?.manage_members || caps?.manage_roles || caps?.manage_departments) list.push(page("people", "People and roles", "/workspace/people", Users, "members departments permissions"));
    if (caps?.view_audit) list.push(page("audit", "Audit log", "/workspace/audit", ShieldCheck, "activity ledger hash chain verify"));

    list.push(
      { id: "act-note", label: "New note", hint: "Action", icon: Plus, keywords: "write create", perform: () => go("/workspace/notes?new=1") },
      { id: "act-chat", label: "Ask a question", hint: "Action", icon: Search, keywords: "chat new", perform: () => go("/workspace/chat") },
      { id: "act-upload", label: "Upload a document", hint: "Action", icon: FileText, keywords: "add file", perform: () => go("/workspace/documents?upload=1") },
    );

    for (const doc of loaded.documents) {
      list.push({
        id: `doc-${doc.id}`, label: doc.title, hint: "Document", icon: FileText,
        detail: `${doc.department?.name ?? "Company-wide"} · ${doc.owner}`, keywords: doc.filename,
        perform: () => go(`/workspace/documents?open=${doc.id}`),
      });
    }
    for (const note of loaded.notes) {
      list.push({
        id: `note-${note.id}`, label: note.title || "Untitled note", hint: "Note", icon: NotebookPen,
        detail: note.body.replace(/\s+/g, " ").slice(0, 90), keywords: note.body,
        perform: () => go(`/workspace/notes?note=${note.id}`),
      });
    }
    for (const notice of loaded.announcements) {
      list.push({
        id: `ann-${notice.id}`, label: notice.title, hint: "Announcement", icon: Megaphone,
        detail: notice.body.replace(/\s+/g, " ").slice(0, 90), keywords: notice.body,
        perform: () => go(`/workspace/announcements?open=${notice.id}`),
      });
    }
    for (const hit of hits) {
      list.push({
        id: `hit-${hit.document_id}`, always: true, label: hit.title, hint: hit.page ? `In text · p. ${hit.page}` : "In text", icon: ScrollText,
        detail: hit.snippet.replace(/\s+/g, " ").slice(0, 110), keywords: hit.snippet,
        perform: () => go(`/workspace/documents?open=${hit.document_id}`),
      });
    }
    list.push(
      { id: "act-theme", label: `Switch to ${next} theme`, hint: "Action", icon: dark ? Sun : Moon, keywords: "dark light black white appearance", perform: () => toggle() },
      { id: "act-out", label: "Sign out", hint: "Action", icon: LogOut, keywords: "log out leave", perform: () => { signOut(); go("/login"); } },
    );
    return list;
  }, [caps, dark, go, hits, loaded, next, toggle]);

  const value = useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <Context.Provider value={value}>
      {children}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        placeholder="Search documents, notes, announcements and pages"
        onQueryChange={onQueryChange}
        loading={searching}
      />
    </Context.Provider>
  );
}
