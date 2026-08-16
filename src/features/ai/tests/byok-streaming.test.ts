import { describe, expect, it } from "vitest";
import { processStreamingResponseWithToolCalls } from "@/utils/stream-utils";
import { NvidiaProvider, NVIDIA_BASE_URL } from "@/features/ai/services/providers/nvidia-provider";

describe("BYOK streaming tool calls", () => {
  it("reassembles fragmented tool-call function names and arguments", async () => {
    const response = new Response(
      [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"read_"}}]}}]}',
        '',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"file","arguments":"{\\"path\\":\\"src/App.tsx\\"}"}}]},"finish_reason":"tool_calls"}]}',
        '',
        "data: [DONE]",
        "",
      ].join("\n"),
      { headers: { "content-type": "text/event-stream" } },
    );
    const calls = await new Promise<unknown[]>((resolve, reject) => {
      void processStreamingResponseWithToolCalls(
        response,
        () => undefined,
        (toolCalls) => resolve(toolCalls),
        () => resolve([]),
        reject,
      );
    });

    expect(calls).toEqual([
      {
        id: "call-1",
        type: "function",
        function: {
          name: "read_file",
          arguments: '{"path":"src/App.tsx"}',
        },
      },
    ]);
  });

  it("uses NVIDIA's OpenAI-compatible max_tokens and tool fields", () => {
    const provider = new NvidiaProvider({
      id: "nvidia",
      name: "NVIDIA NIM",
      apiUrl: `${NVIDIA_BASE_URL}/chat/completions`,
      requiresApiKey: true,
      maxTokens: 4096,
    });
    const payload = provider.buildPayload({
      modelId: "meta/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: "Inspect the project" }],
      maxTokens: 2048,
      temperature: 0.2,
      tools: [
        {
          type: "function",
          function: {
            name: "read_file",
            description: "Read a workspace file",
            parameters: { type: "object" },
          },
        },
      ],
      toolChoice: "auto",
    });

    expect(payload).toMatchObject({
      max_tokens: 2048,
      stream: true,
      tool_choice: "auto",
    });
    expect(payload).not.toHaveProperty("max_completion_tokens");
    expect(payload.tools).toHaveLength(1);
  });
});
