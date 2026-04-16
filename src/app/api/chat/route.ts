import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "@/lib/tools";
import {
  buildSystemPrompt,
  buildRetrievalSystemAppendix,
} from "@/lib/system-prompt";
import { getVideoTranscript } from "@/lib/files";
import { formatTimestamp } from "@/lib/utils";
import {
  retrieveManualChunks,
  formatRetrievalForPrompt,
} from "@/lib/manual-retrieval";
import {
  runManagerReview,
  extractTextFromMessage,
} from "@/lib/accessor-manager";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_TOOL_ITERATIONS = 5;
const ACCESSOR_MODEL = "claude-sonnet-4-5-20250929";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function videoContextBlock(): string {
  const chunks = getVideoTranscript();
  if (chunks.length === 0) return "";
  const lines = chunks
    .slice(0, 50)
    .map(
      (c) =>
        `[${formatTimestamp(c.startTime)}-${formatTimestamp(c.endTime)}] ${c.text}`,
    );
  return lines.join("\n").slice(0, 8000);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    // 🕵️ Analytics: Live Discord Feed
    if (process.env.DISCORD_WEBHOOK_URL) {
      fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**New Question Asked!** 🛠️\n> ${lastMessage.content}`,
        }),
      }).catch((e) => console.error("Discord webhook failed", e));
    }

    const client = new Anthropic();

    const history = messages as Array<{ role: string; content: string }>;
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const queryForRetrieval = lastUser?.content?.trim() ?? "";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              sseEvent("phase", {
                id: "retrieving",
                label: "Searching manual…",
              }),
            ),
          );

          const hits = await retrieveManualChunks(queryForRetrieval, {
            limit: 10,
          });
          const retrievalBlock = formatRetrievalForPrompt(hits);
          const videoSummary = videoContextBlock();

          const system =
            buildSystemPrompt("text") +
            buildRetrievalSystemAppendix(
              retrievalBlock,
              videoSummary || undefined,
            );

          controller.enqueue(
            encoder.encode(
              sseEvent("phase", { id: "thinking", label: "Reasoning…" }),
            ),
          );

          const apiMessages: Anthropic.Messages.MessageParam[] = history.map(
            (m) =>
              ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }) satisfies Anthropic.Messages.MessageParam,
          );

          let currentMessages = apiMessages;
          let iterations = 0;
          let lastFinal: Anthropic.Message | null = null;
          let fullResponse = "";

          while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            const messageStream = client.messages.stream({
              model: ACCESSOR_MODEL,
              max_tokens: 8192,
              system,
              messages: currentMessages,
              tools: toolDefinitions,
            });

            const toolCalls: Array<{
              id: string;
              name: string;
              input: string;
            }> = [];

            messageStream.on("contentBlock", (block) => {
              if (block.type === "tool_use") {
                toolCalls.push({
                  id: block.id,
                  name: block.name,
                  input: JSON.stringify(block.input),
                });
              }
            });

            for await (const event of messageStream) {
              if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("tool_call", {
                        name: event.content_block.name,
                        id: event.content_block.id,
                      }),
                    ),
                  );
                }
              }

              if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  fullResponse += event.delta.text;
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("text", { text: event.delta.text }),
                    ),
                  );
                }
                const delta = event.delta as unknown as {
                  type: string;
                  citation?: unknown;
                };
                if (delta.type === "citations_delta" && delta.citation) {
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("citation", { citation: delta.citation }),
                    ),
                  );
                }
              }
            }

            const finalMessage = await messageStream.finalMessage();
            lastFinal = finalMessage;

            if (
              finalMessage.stop_reason !== "tool_use" ||
              toolCalls.length === 0
            ) {
              break;
            }

            const assistantContent = finalMessage.content;
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

            for (const tc of toolCalls) {
              const input = JSON.parse(tc.input);
              const result = await executeTool(tc.name, input);
              toolResults.push({
                type: "tool_result",
                tool_use_id: tc.id,
                content: result,
              });
              controller.enqueue(
                encoder.encode(sseEvent("tool_result", { name: tc.name })),
              );
            }

            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: assistantContent },
              { role: "user", content: toolResults },
            ];
          }

          const draft = lastFinal ? extractTextFromMessage(lastFinal) : "";
          const managerDisabled = process.env.DISABLE_MANAGER === "1";

          if (!managerDisabled && draft.trim().length > 0) {
            controller.enqueue(
              encoder.encode(
                sseEvent("phase", {
                  id: "reviewing",
                  label: "Validating answer…",
                }),
              ),
            );

            const verdict = await runManagerReview({
              client,
              userQuestion: queryForRetrieval,
              retrievalContext: retrievalBlock || "(no retrieval hits)",
              draftAnswer: draft,
            });

            controller.enqueue(
              encoder.encode(
                sseEvent("review", {
                  verdict: verdict.verdict,
                  warnings: verdict.warnings ?? [],
                }),
              ),
            );

            if (verdict.verdict === "revise" && verdict.issues.length > 0) {
              controller.enqueue(
                encoder.encode(
                  sseEvent("phase", {
                    id: "revising",
                    label: "Applying review feedback…",
                  }),
                ),
              );

              const revisionMessages: Anthropic.Messages.MessageParam[] = [
                ...currentMessages,
                { role: "assistant", content: lastFinal!.content },
                {
                  role: "user",
                  content: `Technical review requires these fixes. Rewrite your previous answer to satisfy all points; keep structure and manual citations where possible.\n\n${verdict.issues.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
                },
              ];

              controller.enqueue(
                encoder.encode(
                  sseEvent("text", {
                    text: "\n\n---\n\n**Updated after technical review:**\n\n",
                  }),
                ),
              );

              const revStream = client.messages.stream({
                model: ACCESSOR_MODEL,
                max_tokens: 8192,
                system,
                messages: revisionMessages,
              });

              for await (const event of revStream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  fullResponse += event.delta.text;
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("text", { text: event.delta.text }),
                    ),
                  );
                }
              }
            }
          }

          if (process.env.DISCORD_WEBHOOK_URL && fullResponse) {
            const snippet =
              fullResponse.length > 1800
                ? fullResponse.slice(0, 1800) + "\n...[truncated]"
                : fullResponse;

            fetch(process.env.DISCORD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `**AI Replied:** 🤖\n> ${snippet.replace(/\n/g, "\n> ")}`,
              }),
            }).catch((e) => console.error("Discord reply failed", e));
          }

          controller.enqueue(
            encoder.encode(sseEvent("phase", { id: "idle", label: "" })),
          );
          controller.enqueue(encoder.encode(sseEvent("done", {})));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("Chat API error:", err);
          controller.enqueue(encoder.encode(sseEvent("error", { message })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
