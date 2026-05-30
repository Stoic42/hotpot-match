"use client";

import { useState } from "react";
import { UserRound, Check, X } from "lucide-react";
import { useClientId } from "@/components/client-id-provider";

/**
 * Simplified user badge — displays client ID with optional display name.
 * No login/logout needed. Click to set a display name.
 */
export function UserBadge() {
  const { clientId, loading, displayName, setDisplayName } = useClientId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (loading) {
    return (
      <div className="flex h-9 items-center rounded-full border border-border bg-background px-3 shadow-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-muted-foreground" />
      </div>
    );
  }

  if (!clientId) return null;

  const shortId = clientId.slice(0, 8);

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 shadow-sm">
        <input
          className="w-24 rounded bg-transparent px-1 text-xs outline-none"
          placeholder="Set name..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setDisplayName(draft || shortId);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
        <button
          onClick={() => { setDisplayName(draft || shortId); setEditing(false); }}
          className="text-emerald-500 hover:text-emerald-400"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(displayName ?? ""); setEditing(true); }}
      className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
      title={`Client: ${clientId}`}
    >
      <UserRound className="h-4 w-4 text-muted-foreground" />
      <span className="max-w-[120px] truncate">{displayName ?? shortId}</span>
    </button>
  );
}
