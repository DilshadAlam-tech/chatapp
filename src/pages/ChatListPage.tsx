import { useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { formatShortTime } from "@/lib/format";
import { getChatPartners, getConversation, getUser } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const conversations = useMemo(() => {
    if (!user) return [];

    const normalizedSearch = search.trim().toLowerCase();

    return getChatPartners(user.id)
      .map((partnerId) => {
        const partner = getUser(partnerId);
        if (!partner) return null;

        const messages = getConversation(user.id, partnerId);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter((message) => message.senderId === partnerId && !message.seen).length;

        return {
          partner,
          lastMessage,
          unreadCount,
        };
      })
      .filter((conversation): conversation is NonNullable<typeof conversation> => Boolean(conversation))
      .filter((conversation) => {
        if (!normalizedSearch) return true;
        return [conversation.partner.username, conversation.partner.gameName, conversation.lastMessage?.text || ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((firstConversation, secondConversation) => {
        const firstTimestamp = firstConversation.lastMessage?.timestamp || "";
        const secondTimestamp = secondConversation.lastMessage?.timestamp || "";
        return secondTimestamp.localeCompare(firstTimestamp);
      });
  }, [search, user]);

  if (!user) return null;

  const summaryCards = [
    { label: "Chats", value: conversations.length },
    { label: "Unread", value: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0) },
    { label: "Online", value: conversations.filter((conversation) => conversation.partner.online).length },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-bold">Messages</h2>
          <p className="text-xs text-muted-foreground">Keep your squad coordination tidy and fast.</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {summaryCards.map((card) => (
            <div key={card.label} className="glass rounded-xl p-3 text-center">
              <p className="font-heading text-lg font-bold text-primary">{card.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="glass mb-4 flex items-center gap-2 rounded-2xl px-3 py-2">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search chats or players"
          />
        </div>

        {conversations.length === 0 ? (
          <div className="glass flex flex-col items-center gap-2 rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
            <MessageSquare size={32} className="opacity-30" />
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground">Start a chat from player discovery to build your squad.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              Find Players
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(({ partner, lastMessage, unreadCount }) => (
              <button
                key={partner.id}
                onClick={() => navigate(`/chat/${partner.id}`)}
                className="glass flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:border-primary/30"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted font-heading text-xs font-bold text-primary">
                    {partner.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      partner.online ? "bg-online" : "bg-muted-foreground",
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{partner.username}</span>
                    {lastMessage && <span className="text-[10px] text-muted-foreground">{formatShortTime(lastMessage.timestamp)}</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{lastMessage?.text || "No messages yet"}</p>
                </div>

                {unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
