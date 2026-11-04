import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Flame, Send, X, Trash2, GripVertical, Loader2 } from "lucide-react";
import { askAssistant } from "@/lib/chat.functions";
import { buildPageContext, guideFor } from "@/lib/page-context";
import { useSelection } from "@/lib/store";
import { useSelectedSeries } from "@/lib/use-series";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sel = useSelection();
  const series = useSelectedSeries();
  const ask = useServerFn(askAssistant);
  const guide = guideFor(path);
  const [byPage, setByPage] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(380);
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = byPage[path] ?? [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setByPage((p) => ({ ...p, [path]: next }));
    setInput("");
    setBusy(true);
    try {
      const r = await ask({ data: { pageContext: buildPageContext(path, sel, series), messages: next.slice(-20) } });
      setByPage((p) => ({ ...p, [path]: [...next, { role: "assistant", content: r.text }] }));
    } catch {
      setByPage((p) => ({ ...p, [path]: [...next, { role: "assistant", content: "Something went wrong. Please try again." }] }));
    } finally {
      setBusy(false);
    }
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = width;
    const move = (ev: PointerEvent) => setWidth(Math.max(300, Math.min(720, w0 + (x0 - ev.clientX))));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!open) return null;

  return (
    <aside style={{ width }} className="sticky top-16 z-[900] hidden h-[calc(100vh-4rem)] shrink-0 border-l border-border bg-sidebar md:flex">
      <div onPointerDown={startResize} title="Drag to resize" className="group flex w-2 cursor-col-resize items-center justify-center hover:bg-primary/10">
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber/40 bg-surface-2"><Flame className="h-4 w-4 text-amber" /></div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-semibold">Fire Assistant</div>
            <div className="truncate text-[11px] text-muted-foreground">Asking about: <span className="text-primary">{guide.name}</span> · {sel.label}</div>
          </div>
          {msgs.length > 0 && <button onClick={() => setByPage((p) => ({ ...p, [path]: [] }))} aria-label="Clear chat" className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>}
          <button onClick={onClose} aria-label="Close assistant" className="rounded p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ask me anything about the <span className="text-foreground">{guide.name}</span> page and the area you've selected.</p>
              <div className="flex flex-col gap-2">
                {guide.suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("text-sm", m.role === "user" ? "ml-8 rounded-lg bg-primary px-3 py-2 text-primary-foreground" : "chat-md text-foreground")}>
              {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the page data…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-md border border-input bg-background/60 p-2 focus-within:border-primary/60">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder={`Ask about ${guide.name}…`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Answers use demonstration data shown on this page.</p>
        </form>
      </div>
    </aside>
  );
}
