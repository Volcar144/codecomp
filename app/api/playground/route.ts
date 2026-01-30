import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { executeCode } from "@/lib/code-execution";
import { 
  canExecuteCode, 
  logExecution, 
  getExecutionTimeout,
  DISABLE_PAYMENT_GATING,
  PLAN_LIMITS
} from "@/lib/subscription-utils";

// GET /api/playground - Get user's playground sessions or public ones
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const { searchParams } = new URL(request.url);
    const shareSlug = searchParams.get("slug");
    const myOnly = searchParams.get("my") === "true";
    const publicOnly = searchParams.get("public") === "true";

    // Get by share slug
    if (shareSlug) {
      const { data, error } = await supabase
        .from("playground_sessions")
        .select("*")
        .eq("share_slug", shareSlug)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Check if user can access
      if (!data.is_public && data.user_id !== session?.user?.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      return NextResponse.json(data);
    }

    // Build query
    let query = supabase
      .from("playground_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (myOnly && session?.user) {
      query = query.eq("user_id", session.user.id);
    } else if (publicOnly) {
      query = query.eq("is_public", true);
    } else if (session?.user) {
      // Get user's sessions + public ones
      query = query.or(`user_id.eq.${session.user.id},is_public.eq.true`);
    } else {
      query = query.eq("is_public", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error("Error fetching playground sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/playground - Create or run playground session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, language, input, title, id, is_public } = body;

    const session = await auth.api.getSession({ headers: await headers() });

    // Run code action
    if (action === "run") {
      if (!code || !language) {
        return NextResponse.json(
          { error: "Code and language are required" },
          { status: 400 }
        );
      }

      // Check execution limits for authenticated users
      const userId = session?.user?.id;
      if (userId && !DISABLE_PAYMENT_GATING) {
        const executionCheck = await canExecuteCode(userId);
        
        if (!executionCheck.allowed) {
          return NextResponse.json({
            error: "Daily execution limit reached",
            message: `You've used all ${executionCheck.limit} executions for today. Upgrade to Pro for unlimited executions.`,
            limit: executionCheck.limit,
            remaining: 0,
            plan: executionCheck.plan,
            upgradeUrl: "/pricing",
          }, { status: 429 });
        }
        
        // Log this execution
        await logExecution(userId);
      }

      // Get timeout based on user's plan
      const timeoutSeconds = userId 
        ? await getExecutionTimeout(userId) 
        : PLAN_LIMITS.free.executionTimeoutSeconds;

      const result = await executeCode(code, language, input || "", timeoutSeconds);

      // Update session if it exists and user owns it
      if (id && session?.user) {
        await supabase
          .from("playground_sessions")
          .update({
            code,
            language,
            input: input || "",
            last_output: result.output || result.error,
          })
          .eq("id", id)
          .eq("user_id", session.user.id);
      }

      // Return execution info along with result
      let executionInfo = null;
      if (userId && !DISABLE_PAYMENT_GATING) {
        const check = await canExecuteCode(userId);
        executionInfo = {
          remaining: check.remaining,
          limit: check.limit,
          plan: check.plan,
        };
      }

      return NextResponse.json({
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        executionInfo,
      });
    }

    // Save/Create session action
    if (action === "save") {
      if (!code || !language) {
        return NextResponse.json(
          { error: "Code and language are required" },
          { status: 400 }
        );
      }

      // Generate share slug if making public
      let shareSlug = null;
      if (is_public) {
        shareSlug = generateSlug();
      }

      if (id && session?.user) {
        // Update existing
        const { data, error } = await supabase
          .from("playground_sessions")
          .update({
            code,
            language,
            input: input || "",
            title: title || "Untitled",
            is_public: is_public || false,
            share_slug: is_public ? shareSlug : null,
          })
          .eq("id", id)
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json(data);
      } else {
        // Create new
        const { data, error } = await supabase
          .from("playground_sessions")
          .insert({
            user_id: session?.user?.id || null,
            code,
            language,
            input: input || "",
            title: title || "Untitled",
            is_public: is_public || false,
            share_slug: is_public ? shareSlug : null,
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json(data);
      }
    }

    // Fork action
    if (action === "fork") {
      if (!id) {
        return NextResponse.json({ error: "Session ID required" }, { status: 400 });
      }

      // Get original session
      const { data: original, error: fetchError } = await supabase
        .from("playground_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !original) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Check access
      if (!original.is_public && original.user_id !== session?.user?.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Create fork
      const { data: fork, error: forkError } = await supabase
        .from("playground_sessions")
        .insert({
          user_id: session?.user?.id || null,
          code: original.code,
          language: original.language,
          input: original.input,
          title: `Fork of ${original.title}`,
          is_public: false,
          forked_from: original.id,
        })
        .select()
        .single();

      if (forkError) throw forkError;

      // Increment fork count
      await supabase.rpc("increment_fork_count", { session_id: original.id });

      return NextResponse.json(fork);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in playground:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// DELETE /api/playground - Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("playground_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
