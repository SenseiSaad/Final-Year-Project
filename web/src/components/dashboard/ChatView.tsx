"use client";

import { ArrowUp, CircleSlash, History, MessageSquarePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { TextShimmer } from "@/components/core/text-shimmer";
import { Mark } from "@/components/site/Logo";
import { useResource } from "@/hooks/useResource";
import {
  errorMessage,
  type ChatMessage,
  type ChatThread,
  type Citation,
  type DocumentItem,
  type ModelCatalog,
  type ProviderInfo,
} from "@/lib/workspace-api";

import { Avatar, btnGhost, btnPrimary, btnSecondary, ConfirmModal, EmptyState, ErrorNote, Modal } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

type Choice = { provider: string; model: string };
type Failure = { question: string; message: string };

const STORAGE_KEY = "docutrust.model";

function readStoredChoice(models: ModelCatalog): Choice {
  const fallback = models.selected;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Choice | null;
    const info = models.providers.find((p) => p.id === stored?.provider);
    if (stored && info?.available && info.models.includes(stored.model)) return stored;
  } catch {
    /* ignore unreadable storage */
  }
  return fallback;
}

export function ChatView({ goToDocuments }: { goToDocuments: () => void }) {
  const { boot, request } = useWorkspace();
  const models = boot!.models;

  const [activeId, setActiveId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>(() => readStoredChoice(models));
  const [pending, setPending] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(
    (signal: AbortSignal) => request<{ threads: ChatThread[] }>("/chats/", { signal }).then((r) => r.threads),
    [request],
  );
  const threads = useResource(loadThreads);

  const loadConversation = useCallback(
    (signal: AbortSignal) =>
      activeId === null
        ? Promise.resolve<ChatMessage[]>([])
        : request<{ messages: ChatMessage[] }>(`/chats/${activeId}/`, { signal }).then((r) => r.messages),
    [request, activeId],
  );
  const conversation = useResource(loadConversation);

  const loadDocumentCount = useCallback(
    (signal: AbortSignal) => request<{ documents: DocumentItem[] }>("/documents/", { signal }).then((r) => r.documents.length),
    [request],
  );
  const documentCount = useResource(loadDocumentCount);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSlow(true), 1500);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [pending]);

  const messages = conversation.data ?? [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, failure]);

  function updateChoice(next: Choice) {
    setChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function startNewChat() {
    setActiveId(null);
    setFailure(null);
    setHistoryOpen(false);
  }

  function openThread(id: number) {
    setActiveId(id);
    setFailure(null);
    setHistoryOpen(false);
  }

  async function send(question: string) {
    if (pending) return;
    setFailure(null);
    setPending(question);
    try {
      const payload = { question, provider: choice.provider, model: choice.model };
      if (activeId === null) {
        const created = await request<{ thread: ChatThread }>("/chats/", { method: "POST", json: payload });
        setActiveId(created.thread.id);
      } else {
        const result = await request<{ messages: ChatMessage[] }>(`/chats/${activeId}/messages/`, {
          method: "POST",
          json: payload,
        });
        conversation.setData((previous) => [...(previous ?? []), ...result.messages]);
      }
      threads.reload();
    } catch (error) {
      setFailure({ question, message: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function deleteThread() {
    if (activeId === null) return;
    try {
      await request(`/chats/${activeId}/`, { method: "DELETE" });
      setConfirmDelete(false);
      setDeleteError(null);
      startNewChat();
      threads.reload();
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  }

  const selectedInfo = models.providers.find((p) => p.id === choice.provider);
  const empty = messages.length === 0 && !pending && !failure && !conversation.loading;

  const history = (
    <ThreadList
      threads={threads.data}
      loading={threads.loading}
      error={threads.error}
      activeId={activeId}
      onOpen={openThread}
      onNew={startNewChat}
      onRetry={threads.reload}
    />
  );

  return (
    <div className="mx-auto grid h-full w-full max-w-[1100px] gap-0 md:grid-cols-[230px_minmax(0,1fr)] md:gap-6">
      <aside className="hidden min-h-0 flex-col border-r border-line pr-4 md:flex">{history}</aside>

      <section className="flex min-h-0 min-w-0 flex-col" aria-label="Conversation">
        <div className="flex shrink-0 items-center gap-2 pb-3 md:hidden">
          <button type="button" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen} className={btnSecondary}>
            <History className="size-4" strokeWidth={1.5} />
            History
          </button>
          <button type="button" onClick={startNewChat} className={btnSecondary}>
            <MessageSquarePlus className="size-4" strokeWidth={1.5} />
            New chat
          </button>
        </div>

        {historyOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto md:hidden">{history}</div>
        ) : (
          <>
            {activeId !== null && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line pb-2">
                <p className="min-w-0 truncate text-[14px] font-medium">
                  {threads.data?.find((t) => t.id === activeId)?.title ?? "Conversation"}
                </p>
                <button type="button" onClick={() => setConfirmDelete(true)} className={btnGhost}>
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                  Delete
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Messages">
              {conversation.loading && activeId !== null && (
                <p className="py-10 text-center text-[14px] text-ink-3" role="status">
                  Loading conversation…
                </p>
              )}
              {conversation.error && (
                <div className="py-4">
                  <ErrorNote onRetry={conversation.reload}>{conversation.error}</ErrorNote>
                </div>
              )}
              {empty && (
                <EmptyState
                  title="Ask about your documents"
                  action={
                    documentCount.data === 0 ? (
                      <button type="button" onClick={goToDocuments} className={btnPrimary}>
                        Add a document
                      </button>
                    ) : undefined
                  }
                >
                  {documentCount.data === undefined
                    ? "Answers cite the passages they come from."
                    : documentCount.data === 0
                      ? "This persona cannot open any documents yet. Upload one to get cited answers."
                      : `${documentCount.data} ${documentCount.data === 1 ? "document is" : "documents are"} available to this persona. Answers cite the passages they come from.`}
                </EmptyState>
              )}
              <ul className="divide-y divide-line">
                {messages.map((message) => (
                  <li key={message.id} className="py-5">
                    <Message message={message} />
                  </li>
                ))}
                {pending && (
                  <li className="space-y-4 py-5">
                    <Message message={{ id: -1, role: "user", content: pending, status: "", citations: [], provider: "", model: "", created_at: "" }} />
                    <div className="flex items-start gap-3" role="status">
                      <Mark className="size-7" />
                      <TextShimmer className="pt-1 text-[14px]" duration={1.4}>
                        {slow
                          ? `Waiting for ${selectedInfo?.label ?? "the model"} · ${choice.model || "default model"}…`
                          : "Searching documents you can open…"}
                      </TextShimmer>
                    </div>
                  </li>
                )}
                {failure && (
                  <li className="space-y-4 py-5">
                    <Message message={{ id: -2, role: "user", content: failure.question, status: "", citations: [], provider: "", model: "", created_at: "" }} />
                    <div className="pl-10">
                      <ErrorNote onRetry={() => send(failure.question)}>{failure.message}</ErrorNote>
                    </div>
                  </li>
                )}
              </ul>
              <div ref={endRef} />
            </div>

            <div className="shrink-0 pt-3">
              <Composer disabled={!!pending} onSend={send} />
              <ModelPicker models={models} value={choice} onChange={updateChoice} info={selectedInfo} />
            </div>
          </>
        )}
      </section>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this chat?"
        description="The conversation is removed from your history. Its questions stay in the audit log."
        confirmLabel="Delete chat"
        error={deleteError}
        onConfirm={deleteThread}
        onClose={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

function ThreadList({
  threads,
  loading,
  error,
  activeId,
  onOpen,
  onNew,
  onRetry,
}: {
  threads: ChatThread[] | undefined;
  loading: boolean;
  error: string | undefined;
  activeId: number | null;
  onOpen: (id: number) => void;
  onNew: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button type="button" onClick={onNew} className={`${btnSecondary} hidden w-full md:inline-flex`}>
        <MessageSquarePlus className="size-4" strokeWidth={1.5} />
        New chat
      </button>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {error && <ErrorNote onRetry={onRetry}>{error}</ErrorNote>}
        {loading && !threads && <p className="px-2 py-3 text-[13px] text-ink-3">Loading chats…</p>}
        {threads && threads.length === 0 && <p className="px-2 py-3 text-[13px] leading-[19px] text-ink-3">No conversations yet. Your questions are saved here.</p>}
        <ul className="grid gap-0.5">
          {threads?.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onOpen(thread.id)}
                aria-current={thread.id === activeId ? "true" : undefined}
                className={`w-full rounded-lg px-3 py-2 text-left text-[14px] leading-[20px] transition-colors ${
                  thread.id === activeId ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-raised hover:text-ink"
                }`}
              >
                <span className="line-clamp-2">{thread.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const { boot } = useWorkspace();
  const [openSource, setOpenSource] = useState<number | null>(null);

  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3">
        <Avatar name="U" className="size-7" />
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-[15px] font-medium leading-[23px]">{message.content}</p>
      </div>
    );
  }

  if (message.status === "refused") {
    return (
      <div className="flex items-start gap-3">
        <Mark className="size-7" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-2 text-[14px] font-medium">
            <CircleSlash className="size-4 text-ink-2" strokeWidth={1.5} />
            No permitted source matched
          </p>
          <p className="mt-1 text-[15px] leading-[24px] text-ink-2">{message.content}</p>
        </div>
      </div>
    );
  }

  const parts = message.content.split(/(\[Source \d+\])/g);
  const provider = boot?.models.providers.find((p) => p.id === message.provider);
  return (
    <div className="flex items-start gap-3">
      <Mark className="size-7" />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-[26px] text-ink-2">
          {parts.map((part, index) => {
            const match = /^\[Source (\d+)\]$/.exec(part);
            if (!match) return part;
            const number = Number(match[1]);
            const exists = message.citations.some((c) => c.source === number);
            return exists ? (
              <button
                key={index}
                type="button"
                onClick={() => setOpenSource(openSource === number ? null : number)}
                aria-label={`Show source ${number}`}
                className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded border border-line-strong px-1 align-baseline text-[11px] font-medium text-ink hover:bg-raised"
              >
                {number}
              </button>
            ) : null;
          })}
        </p>
        {message.citations.length > 0 && (
          <SourceList citations={message.citations} open={openSource} onToggle={(n) => setOpenSource(openSource === n ? null : n)} />
        )}
        {message.provider && (
          <p className="mt-3 text-[12px] text-ink-3">
            {provider?.label ?? message.provider} · {message.model}
          </p>
        )}
      </div>
    </div>
  );
}

function SourceList({ citations, open, onToggle }: { citations: Citation[]; open: number | null; onToggle: (n: number) => void }) {
  return (
    <ul className="mt-3.5 grid gap-1.5" aria-label="Sources">
      {citations.map((citation) => {
        const expanded = open === citation.source;
        return (
          <li key={citation.source} className="rounded-lg border border-line">
            <button
              type="button"
              onClick={() => onToggle(citation.source)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]"
            >
              <span className="grid h-5 min-w-5 place-items-center rounded border border-line-strong px-1 text-[11px] font-medium">
                {citation.source}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{citation.title}</span>
              {citation.page && <span className="shrink-0 text-ink-3">p. {citation.page}</span>}
            </button>
            {expanded && (
              <p className="border-t border-line px-3 py-2.5 text-[13px] leading-[20px] text-ink-2">{citation.snippet}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Composer({ disabled, onSend }: { disabled: boolean; onSend: (question: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const question = value.trim();
    if (!question || disabled) return;
    onSend(question);
    setValue("");
    if (ref.current) ref.current.style.height = "";
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-2"
    >
      <label htmlFor="chat-question" className="sr-only">
        Ask a question about your documents
      </label>
      <textarea
        id="chat-question"
        ref={ref}
        rows={1}
        value={value}
        maxLength={4000}
        onChange={(event) => {
          setValue(event.target.value);
          event.target.style.height = "auto";
          event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about your documents"
        className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-[22px] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <button type="submit" disabled={disabled || !value.trim()} aria-label="Send question" className={`${btnPrimary} size-10 px-0`}>
        <ArrowUp className="size-4" strokeWidth={2} />
      </button>
    </form>
  );
}

function ModelPicker({
  models,
  value,
  onChange,
  info,
}: {
  models: ModelCatalog;
  value: Choice;
  onChange: (choice: Choice) => void;
  info: ProviderInfo | undefined;
}) {
  const [pendingProvider, setPendingProvider] = useState<ProviderInfo | null>(null);
  const current = info ?? models.providers[0];

  function switchProvider(id: string) {
    const target = models.providers.find((p) => p.id === id);
    if (!target || target.id === value.provider) return;
    if (target.external && !current.external) setPendingProvider(target);
    else onChange({ provider: target.id, model: target.default_model });
  }

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="provider-select" className="sr-only">
          Model provider
        </label>
        <select
          id="provider-select"
          value={value.provider}
          onChange={(event) => switchProvider(event.target.value)}
          className="h-9 min-w-0 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink"
        >
          {models.providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
              {provider.available ? "" : " (not available)"}
            </option>
          ))}
        </select>
        <label htmlFor="model-select" className="sr-only">
          Model
        </label>
        <select
          id="model-select"
          value={value.model}
          onChange={(event) => onChange({ provider: value.provider, model: event.target.value })}
          disabled={current.models.length === 0}
          className="h-9 min-w-0 max-w-[60%] flex-1 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink sm:max-w-[16rem] sm:flex-none"
        >
          {current.models.length === 0 && <option value="">No model configured</option>}
          {current.models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-[12px] leading-[18px] text-ink-3">
        {!current.available
          ? current.note
          : current.external
            ? `Your question and the passages retrieved from permitted documents are sent to ${current.label}.`
            : "Runs through Ollama on the workspace server. Nothing is sent to a cloud provider."}
      </p>

      <Modal
        open={pendingProvider !== null}
        onClose={() => setPendingProvider(null)}
        title={`Send questions to ${pendingProvider?.label ?? "an external provider"}?`}
        description="This provider runs outside the workspace server."
      >
        <p className="text-[14px] leading-[22px] text-ink-2">
          Each question, and the passages retrieved from documents this persona may open, will be sent to {pendingProvider?.label}
          {" "}for processing. Use synthetic data only in this public demo.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setPendingProvider(null)} className={btnSecondary}>
            Stay on {current.label}
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingProvider) onChange({ provider: pendingProvider.id, model: pendingProvider.default_model });
              setPendingProvider(null);
            }}
            className={btnPrimary}
          >
            Use {pendingProvider?.label}
          </button>
        </div>
      </Modal>
    </div>
  );
}
