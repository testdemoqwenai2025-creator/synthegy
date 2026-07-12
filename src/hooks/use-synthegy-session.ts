"use client";

// useSynthegySession — manages the active chemist session in localStorage
// so evaluator runs accumulate across page reloads. Auto-creates a session
// on first use via the backend API.

import * as React from "react";
import { api, type Session } from "@/lib/synthegy/api";

const STORAGE_KEY = "synthegy:active-session-id";
const LABEL_KEY = "synthegy:active-session-label";

export function useSynthegySession(refreshKey?: number) {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState<string>("Ad-hoc session");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Hydrate from localStorage on mount AND when refreshKey changes
  // (so sibling components that share localStorage stay in sync).
  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedLabel = window.localStorage.getItem(LABEL_KEY);
    if (storedLabel) setLabel(storedLabel);
    if (stored) {
      // Verify the session still exists on the backend.
      api
        .getSession(stored)
        .then((detail) => {
          setSessionId(detail.session.id);
          setLabel(detail.session.label);
          window.localStorage.setItem(LABEL_KEY, detail.session.label);
        })
        .catch(() => {
          // Session was deleted server-side — drop and recreate on next call.
          window.localStorage.removeItem(STORAGE_KEY);
          setSessionId(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshKey]);

  const ensureSession = React.useCallback(
    async (preferredLabel?: string): Promise<Session | null> => {
      setError(null);
      try {
        if (sessionId) {
          // We already have one; just return a thin object.
          return {
            id: sessionId,
            label,
            chemistId: null,
            createdAt: 0,
            updatedAt: 0,
            runCount: 0,
          };
        }
        const lbl = preferredLabel || label || "Ad-hoc session";
        const { session } = await api.createSession(lbl);
        setSessionId(session.id);
        setLabel(session.label);
        window.localStorage.setItem(STORAGE_KEY, session.id);
        window.localStorage.setItem(LABEL_KEY, session.label);
        return session;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create session";
        setError(msg);
        return null;
      }
    },
    [sessionId, label]
  );

  const reset = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LABEL_KEY);
    setSessionId(null);
    setLabel("Ad-hoc session");
  }, []);

  return { sessionId, label, loading, error, ensureSession, reset, setLabel };
}
