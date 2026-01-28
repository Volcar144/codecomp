/**
 * Interactive Terminal API
 * WebSocket-like interface for interactive code execution sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPistonClient } from "@/lib/piston-client";
import { headers } from "next/headers";

// In-memory session store (use Redis in production)
const activeSessions: Map<
  string,
  {
    userId: string;
    arenaId?: string;
    language: string;
    createdAt: Date;
    output: string[];
  }
> = new Map();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, code, language, input, arenaId } = body;

    const piston = getPistonClient();

    switch (action) {
      case "create": {
        if (!language) {
          return NextResponse.json(
            { error: "Language is required" },
            { status: 400 }
          );
        }

        // Create interactive session
        const newSessionId = await piston.runInteractive(code || "", language);

        activeSessions.set(newSessionId, {
          userId: session.user.id,
          arenaId,
          language,
          createdAt: new Date(),
          output: [],
        });

        return NextResponse.json({
          sessionId: newSessionId,
          message: "Session created",
        });
      }

      case "execute": {
        if (!code || !language) {
          return NextResponse.json(
            { error: "Code and language are required" },
            { status: 400 }
          );
        }

        // Run code (non-interactive)
        const result = await piston.run({
          language,
          version: "*",
          code,
          stdin: input || "",
        });

        return NextResponse.json({
          output: result.run.stdout,
          error: result.run.stderr,
          exitCode: result.run.code,
          compile: result.compile
            ? {
                output: result.compile.stdout,
                error: result.compile.stderr,
              }
            : undefined,
        });
      }

      case "input": {
        if (!sessionId || !input) {
          return NextResponse.json(
            { error: "Session ID and input are required" },
            { status: 400 }
          );
        }

        const sessionData = activeSessions.get(sessionId);
        if (!sessionData || sessionData.userId !== session.user.id) {
          return NextResponse.json(
            { error: "Session not found or access denied" },
            { status: 404 }
          );
        }

        await piston.sendInput(sessionId, input);
        sessionData.output.push(`> ${input}`);

        return NextResponse.json({ success: true });
      }

      case "destroy": {
        if (!sessionId) {
          return NextResponse.json(
            { error: "Session ID is required" },
            { status: 400 }
          );
        }

        const sessionData = activeSessions.get(sessionId);
        if (sessionData && sessionData.userId === session.user.id) {
          piston.destroySession(sessionId);
          activeSessions.delete(sessionId);
        }

        return NextResponse.json({ success: true });
      }

      case "status": {
        if (!sessionId) {
          return NextResponse.json(
            { error: "Session ID is required" },
            { status: 400 }
          );
        }

        const sessionData = activeSessions.get(sessionId);
        if (!sessionData || sessionData.userId !== session.user.id) {
          return NextResponse.json(
            { error: "Session not found or access denied" },
            { status: 404 }
          );
        }

        const pistonSession = piston.getSession(sessionId);

        return NextResponse.json({
          sessionId,
          language: sessionData.language,
          status: pistonSession?.status || "unknown",
          createdAt: sessionData.createdAt,
          output: sessionData.output,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: create, execute, input, destroy, status" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in terminal API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const piston = getPistonClient();

    // Get available runtimes
    const runtimes = await piston.getRuntimes();

    // Get user's active sessions
    const userSessions = Array.from(activeSessions.entries())
      .filter(([, data]) => data.userId === session.user.id)
      .map(([id, data]) => ({
        id,
        language: data.language,
        arenaId: data.arenaId,
        createdAt: data.createdAt,
      }));

    return NextResponse.json({
      runtimes,
      sessions: userSessions,
    });
  } catch (error) {
    console.error("Error fetching terminal info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
