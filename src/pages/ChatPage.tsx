import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, ExternalLink, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime, formatShortTime } from "@/lib/format";
import { getConversation, getUser, markSeen, sendMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

const starterMessages = [
  "Need one more player for tonight's scrim?",
  "Are you available for ranked this evening?",
  "Want to try out for my squad?",
];

export default function ChatPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(user && id ? getConversation(user.id, id) : []);
  const bottomRef = useRef<HTMLDivElement>(null);

  const partner = id ? getUser(id) : undefined;

  useEffect(() => {
    if (!user || !id) return;

    markSeen(id, user.id);
    const interval = setInterval(() => {
      setMessages(getConversation(user.id, id));
    }, 1000);

    return () => clearInterval(interval);
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user || !partner) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    sendMessage(user.id, partner.id, text.trim());
    setText("");
    setMessages(getConversation(user.id, partner.id));
  };

  const fillStarterMessage = (value: string) => {
    setText(value);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="glass sticky top-0 z-50 border-b border-border px-3 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => navigate("/chat")} className="p-1">
            <ArrowLeft size={20} />
          </button>

          <button
            onClick={() => navigate(`/player/${partner.id}`)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted font-heading text-xs font-bold text-primary">
              {partner.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{partner.username}</p>
              <p className={cn("text-[10px]", partner.online ? "text-online" : "text-muted-foreground")}>
                {partner.online ? "Online now" : `Seen ${formatRelativeTime(partner.lastSeen)}`}
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate(`/player/${partner.id}`)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-4">
        {messages.length === 0 ? (
          <div className="glass mb-4 rounded-2xl px-5 py-8 text-center">
            <p className="font-medium text-foreground">Start the conversation</p>
            <p className="mt-1 text-xs text-muted-foreground">A crisp first message helps teammates respond faster.</p>
          </div>
        ) : null}

        {messages.length === 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {starterMessages.map((message) => (
              <button
                key={message}
                type="button"
                onClick={() => fillStarterMessage(message)}
                className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {message}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto pb-4 scrollbar-hide">
          {messages.map((message) => {
            const mine = message.senderId === user.id;

            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                  )}
                >
                  <p>{message.text}</p>
                  <div
                    className={cn(
                      "mt-0.5 flex items-center justify-end gap-1",
                      mine ? "text-primary-foreground/60" : "text-muted-foreground",
                    )}
                  >
                    <span className="text-[9px]">{formatShortTime(message.timestamp)}</span>
                    {mine && (message.seen ? <CheckCheck size={11} /> : <Check size={11} />)}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSend} className="glass border-t border-border p-3">
        <div className="mx-auto flex max-w-lg gap-2">
          <input
            className="flex-1 rounded-full border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-full gradient-neon-btn text-primary-foreground neon-glow"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
