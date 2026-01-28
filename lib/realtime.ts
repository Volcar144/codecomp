"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

// Define the payload type manually since the import may not work
interface PostgresChangesPayload<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

interface RealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: ChangeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to Supabase Realtime changes
 */
export function useRealtimeSubscription<T>(
  options: RealtimeOptions<T>
) {
  const {
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    // Build the channel with postgres_changes subscription
    // Using type assertion to handle Supabase's strict typing
    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: PostgresChangesPayload<T>) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate({ old: payload.old as T, new: payload.new as T });
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old as T);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setStatus("disconnected");
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setStatus("disconnected");
    };
  }, [table, schema, event, filter, enabled, onInsert, onUpdate, onDelete]);

  return { status };
}

/**
 * Hook for real-time leaderboard updates
 */
export function useRealtimeLeaderboard(competitionId: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("competition_id", competitionId)
        .order("rank", { ascending: true });

      if (error) throw error;
      setLeaderboard(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [competitionId]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Subscribe to submission changes (which affect leaderboard)
  useRealtimeSubscription<Submission>({
    table: "submissions",
    filter: `competition_id=eq.${competitionId}`,
    onInsert: () => fetchLeaderboard(),
    onUpdate: () => fetchLeaderboard(),
    enabled: !!competitionId,
  });

  return { leaderboard, isLoading, error, refetch: fetchLeaderboard };
}

/**
 * Hook for real-time competition updates
 */
export function useRealtimeCompetition(competitionId: string) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial competition
  useEffect(() => {
    async function fetchCompetition() {
      try {
        const { data, error } = await supabase
          .from("competitions")
          .select("*")
          .eq("id", competitionId)
          .single();

        if (error) throw error;
        setCompetition(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch competition");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompetition();
  }, [competitionId]);

  // Subscribe to competition updates
  useRealtimeSubscription<Competition>({
    table: "competitions",
    filter: `id=eq.${competitionId}`,
    onUpdate: ({ new: updated }) => setCompetition(updated),
    enabled: !!competitionId,
  });

  return { competition, isLoading, error };
}

/**
 * Hook for real-time submission status updates
 */
export function useRealtimeSubmission(submissionId: string) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial submission
  useEffect(() => {
    async function fetchSubmission() {
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("id", submissionId)
          .single();

        if (error) throw error;
        setSubmission(data);
      } catch (err) {
        console.error("Failed to fetch submission:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubmission();
  }, [submissionId]);

  // Subscribe to submission updates
  useRealtimeSubscription<Submission>({
    table: "submissions",
    filter: `id=eq.${submissionId}`,
    onUpdate: ({ new: updated }) => setSubmission(updated),
    enabled: !!submissionId,
  });

  return { submission, isLoading };
}

/**
 * Hook for real-time arena leaderboard
 */
export function useRealtimeArenaLeaderboard(arenaId: string) {
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("arena_leaderboard")
        .select("*")
        .eq("arena_id", arenaId)
        .order("rank", { ascending: true });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error("Failed to fetch arena leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [arenaId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Subscribe to score changes
  useRealtimeSubscription<ArenaScore>({
    table: "arena_scores",
    filter: `arena_id=eq.${arenaId}`,
    onInsert: () => fetchLeaderboard(),
    onUpdate: () => fetchLeaderboard(),
    onDelete: () => fetchLeaderboard(),
    enabled: !!arenaId,
  });

  return { leaderboard, isLoading, refetch: fetchLeaderboard };
}

/**
 * Hook for real-time notification count
 */
export function useRealtimeNotifications(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch {
      // Notifications table may not exist yet
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId, fetchNotifications]);

  useRealtimeSubscription<Notification>({
    table: "notifications",
    filter: `user_id=eq.${userId}`,
    onInsert: (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    },
    enabled: !!userId,
  });

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead, refetch: fetchNotifications };
}

// Type definitions
interface LeaderboardEntry {
  competition_id: string;
  user_id: string;
  best_score: number;
  best_time: number;
  total_submissions: number;
  last_submission: string;
  rank: number;
}

interface Submission {
  id: string;
  competition_id: string;
  user_id: string;
  code: string;
  language: string;
  status: string;
  score: number;
  execution_time: number | null;
  memory_used: number | null;
  error_message: string | null;
  submitted_at: string;
}

interface Competition {
  id: string;
  title: string;
  description: string;
  rules: string | null;
  start_date: string;
  end_date: string;
  creator_id: string;
  allowed_languages: string[];
  status: string;
  is_public: boolean;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

interface ArenaLeaderboardEntry {
  arena_id: string;
  user_id: string;
  github_username: string | null;
  directory_path: string;
  avg_score: number;
  judges_scored: number;
  last_scored: string;
  rank: number;
}

interface ArenaScore {
  id: string;
  arena_id: string;
  participant_id: string;
  judge_id: string;
  score: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
