"use client";

import { ArrowLeft, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { TransitionLink } from "@/components/motion/TransitionLink";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { errorMessage, type Bootstrap, type ChatMessage, type ChatThread, type DocumentItem, type ModelCatalog } from "@/lib/workspace-api";

import { ConfirmModal, ErrorNote, Skeleton } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { AnswerMessage } from "./ChatMessage";
import { Composer } from "./Composer";
import { ModelPicker, type Choice } from "./ModelPicker";
import { useStaggerIn } from "./useStaggerIn";

type Pending = { question: string; threadId: number | null };
type Failure = { question: string; message: string };

const STORAGE_KEY = "docutrust.model";

const EXAMPLES = ["How many unused leave days can I carry into next year?", "When does a travel expense need approval?", "Can I work from home on Fridays?"];

function readStoredChoice(models: ModelCatalog): Choice {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Choice | null;
    const info = models.providers.find((p) => p.id === stored?.provider);
    if (stored && info?.available && info.models.includes(stored.model)) return stored;
  } catch {
    /* ignore unreadable storage */
  }
  return models.selected;
}

export function ChatView() {
  const { boot } = useWorkspace();
  if (!boot) return <ChatSkeleton />;
  return <ChatScreen boot={boot} />;
}

function ChatSkeleton() {
  return (
    <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden border-r border-line p-4 lg:grid lg:content-start lg:gap-2">
        <Skeleton className="h-8 w-24" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <div className="p-6">
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}

function ChatScreen({ boot }: { boot: Bootstrap }) {
  const { request } = useWorkspace();
  const { notify } = useToast();
  const reduced = useReducedMotion();
  const models = boot.models;

  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "chat">("chat");
  const [paneKey, setPaneKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conv, setConv] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const [choice, setChoice] = useState<Choice>(() => readStoredChoice(models));
  const [pending, setPending] = useState<Pending | null>(null);
  const [slow, setSlow] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeRef = useRef<number | null>(null);
  const loadToken = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const loadThreads = useCallback((signal: AbortSignal) => request<{ threads: ChatThread[] }>("/chats/", { signal }).then((r) => r.threads), [request]);
  const threads = useResource(loadThreads);

  const loadDocumentCount = useCallback((signal: AbortSignal) => request<{ documents: DocumentItem[] }>("/documents/", { signal }).then((r) => r.documents.length), [request]);
  const documentCount = useResource(loadDocumentCount);

  useStaggerIn(listRef, "[data-row]", threads.data !== undefined);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSlow(true), 1500);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [pending]);

  // Keep the newest exchange in view
  const showPending = pending !== null && pending.threadId === activeId;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages.length, showPending, failure, reduced]);

  const loadConversation = useCallback(
    async (id: number) => {
      const token = ++loadToken.current;
      setConv({ loading: true, error: null });
      try {
        const result = await request<{ messages: ChatMessage[] }>(`/chats/${id}/`);
        if (token !== loadToken.current) return;
        setMessages(result.messages);
        setConv({ loading: false, error: null });
      } catch (error) {
        if (token !== loadToken.current) return;
        setConv({ loading: false, error: errorMessage(error) });
      }
    },
    [request],
  );

  function select(id: number | null, remount = true) {
    activeRef.current = id;
    if (remount) setPaneKey((key) => key + 1);
    loadToken.current += 1;
    setActiveId(id);
    setMessages([]);
    setFresh(new Set());
    setFailure(null);
    setConv({ loading: false, error: null });
    setView("chat");
  }

  function openThread(id: number) {
    select(id);
    void loadConversation(id);
  }

  function updateChoice(next: Choice) {
    setChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  async function send(question: string) {
    if (pending) return;
    const target = activeRef.current;
    setFailure(null);
    setPending({ question, threadId: target });
    const markFresh = (items: ChatMessage[]) => setFresh((prev) => new Set([...prev, ...items.filter((m) => m.role === "assistant").map((m) => m.id)]));
    try {
      const payload = { question, provider: choice.provider, model: choice.model };
      if (target === null) {
        const created = await request<{ thread: ChatThread; messages?: ChatMessage[] }>("/chats/", { method: "POST", json: payload });
        if (activeRef.current === null) {
          select(created.thread.id, false);
          if (created.messages) {
            setMessages(created.messages);
            markFresh(created.messages);
          } else {
            void loadConversation(created.thread.id);
          }
        }
      } else {
        const result = await request<{ messages: ChatMessage[] }>(`/chats/${target}/messages/`, { method: "POST", json: payload });
        if (activeRef.current === target) {
          setMessages((previous) => [...previous, ...result.messages]);
          markFresh(result.messages);
        }
      }
      threads.reload();
    } catch (error) {
      if (activeRef.current === target) setFailure({ question, message: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function deleteThread() {
    if (activeId === null) return;
    setDeleting(true);
    try {
      await request(`/chats/${activeId}/`, { method: "DELETE" });
      setConfirmDelete(false);
      select(null);
      setView("list");
      threads.reload();
      notify("Chat deleted");
    } catch (error) {
      setConfirmDelete(false);
      notify(errorMessage(error), "error");
    } finally {
      setDeleting(false);
    }
  }

  const selectedInfo = models.providers.find((p) => p.id === choice.provider);
  const title = threads.data?.find((t) => t.id === activeId)?.title ?? (activeId === null ? "New chat" : "Conversation");
  const empty = messages.length === 0 && !showPending && !failure && !conv.loading && !conv.error;
  const docs = documentCount.data;

  // The question each answer belongs to, for marking matched words in its passages
  const questionFor = (index: number) => {
    for (let i = index - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i].content;
    return "";
  };

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside aria-label="Conversations" className={cn("min-h-0 min-w-0 flex-col border-line lg:flex lg:border-r", view === "list" ? "flex" : "hidden")}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          <h1 className="text-[16px] font-medium">AI chat</h1>
          <Button variant="secondary" size="sm" onClick={() => select(null)}>
            <Plus className="size-4" strokeWidth={1.5} />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {threads.error && <ErrorNote message={threads.error} onRetry={threads.reload} />}
          {threads.data === undefined && !threads.error && (
            <div className="grid gap-1" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          {threads.data?.length === 0 && <p className="px-3 py-3 text-[14px] leading-[22px] text-ink-3">No conversations yet. Your questions are saved here.</p>}
          <ul ref={listRef} className="grid grid-cols-1 gap-0.5">
            {threads.data?.map((thread) => (
              <li key={thread.id} data-row="">
                <button
                  type="button"
                  onClick={() => openThread(thread.id)}
                  aria-current={thread.id === activeId ? "true" : undefined}
                  className={cn(
                    "flex h-10 w-full items-center rounded-[10px] px-3 text-left text-[14px] transition-colors duration-150",
                    thread.id === activeId ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
                  )}
                >
                  <span className="truncate">{thread.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section aria-label="Conversation" className={cn("min-h-0 min-w-0 flex-col lg:flex", view === "chat" ? "flex" : "hidden")}>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5">
          <Button variant="ghost" size="icon" className="-ml-1 lg:hidden" aria-label="Back to conversations" onClick={() => setView("list")}>
            <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium">{title}</h2>
          {activeId !== null && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" strokeWidth={1.5} />
              Delete
            </Button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div key={paneKey} ref={scroller} className="min-h-0 flex-1 animate-[fade-in_300ms_var(--ease-soft)_both] overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[64rem] px-5 sm:px-8">
              {conv.loading && (
                <div className="grid gap-3 py-8" role="status" aria-label="Loading conversation">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                </div>
              )}
              {conv.error && (
                <div className="py-6">
                  <ErrorNote message={conv.error} onRetry={() => activeId !== null && void loadConversation(activeId)} />
                </div>
              )}
              {empty && (
                <div className="py-12 sm:py-20">
                  <h3 className="text-[18px] font-medium">Ask about your documents</h3>
                  <p className="mt-2 max-w-[34rem] text-[14px] leading-[22px] text-ink-2">
                    {docs === undefined
                      ? "Answers cite the passages they come from."
                      : docs === 0
                        ? "You cannot open any documents yet. Add one to get cited answers."
                        : `${docs} ${docs === 1 ? "document is" : "documents are"} open to you. Each answer cites the passages it comes from.`}
                  </p>
                  {docs === 0 ? (
                    <TransitionLink href="/workspace/documents" className={buttonStyles({ className: "mt-6" })}>
                      Add a document
                    </TransitionLink>
                  ) : (
                    <ul className="mt-6 grid max-w-[34rem] gap-2" aria-label="Example questions">
                      {EXAMPLES.map((example) => (
                        <li key={example}>
                          <button
                            type="button"
                            disabled={pending !== null}
                            onClick={() => void send(example)}
                            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-line-strong px-4 py-2 text-left text-[14px] transition-colors duration-150 hover:bg-hover disabled:opacity-50"
                          >
                            {example}
                            <ArrowUpRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div role="log" aria-live="polite" aria-label="Messages">
                <ol>
                  {messages.map((message, index) =>
                    message.role === "user" ? (
                      <li key={message.id} className={cn("pb-3 pt-7", index > 0 && "border-t border-line")}>
                        <div className="flex items-start gap-3"><span aria-label="You" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border border-line-strong font-mono text-[12px]">U</span><p className="min-w-0 whitespace-pre-wrap break-words text-[16px] font-medium leading-[26px]">{message.content}</p></div>
                      </li>
                    ) : (
                      <li key={message.id} className="pb-7">
                        <AnswerMessage message={message} question={questionFor(index)} provider={models.providers.find((p) => p.id === message.provider)} fresh={fresh.has(message.id)} />
                      </li>
                    ),
                  )}
                  {showPending && pending && (
                    <>
                      <li className={cn("animate-[rise-in_320ms_var(--ease-soft)_both] pb-3 pt-7", messages.length > 0 && "border-t border-line")}>
                        <div className="flex items-start gap-3"><span aria-label="You" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border border-line-strong font-mono text-[12px]">U</span><p className="min-w-0 whitespace-pre-wrap break-words text-[16px] font-medium leading-[26px]">{pending.question}</p></div>
                      </li>
                      <li className="pb-7">
                        <p className="flex items-center gap-2.5 text-[14px] text-ink-2">
                          <Spinner className="size-4" />
                          {slow ? `Waiting for ${selectedInfo?.label ?? "the model"}${choice.model ? ` (${choice.model})` : ""}` : "Searching permitted documents"}
                        </p>
                      </li>
                    </>
                  )}
                  {failure && (
                    <>
                      <li className={cn("pb-3 pt-7", messages.length > 0 && "border-t border-line")}>
                        <div className="flex items-start gap-3"><span aria-label="You" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border border-line-strong font-mono text-[12px]">U</span><p className="min-w-0 whitespace-pre-wrap break-words text-[16px] font-medium leading-[26px]">{failure.question}</p></div>
                      </li>
                      <li className="pb-7">
                        <ErrorNote message={failure.message} onRetry={() => void send(failure.question)} />
                      </li>
                    </>
                  )}
                </ol>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-line">
            <div className="mx-auto grid w-full max-w-[64rem] gap-3 px-5 pb-4 pt-3 sm:px-8">
              <ModelPicker models={models} value={choice} onChange={updateChoice} />
              <Composer
                id="chat-question"
                label="Ask a question about your documents"
                placeholder="Ask about your documents"
                sendLabel="Send question"
                onSend={(text) => {
                  if (pending) return false;
                  void send(text);
                  return true;
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this chat?"
        text="The conversation is removed from your history. Its questions stay in the audit log."
        confirmLabel="Delete chat"
        busy={deleting}
        onConfirm={() => void deleteThread()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
