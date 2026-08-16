import { describe, expect, it, vi } from "vite-plus/test";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { OpenAICompatibleProvider } from "@/features/ai/services/providers/openai-compatible-provider";

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

const mockedTauriFetch = vi.mocked(tauriFetch);

function createProvider() {
  return new OpenAICompatibleProvider({
    id: "custom",
    name: "Custom",
    apiUrl: "",
    requiresApiKey: false,
    maxTokens: 4096,
  });
}

describe("custom OpenAI-compatible provider", () => {
  it("loads model IDs and names from the configured endpoint with the saved API key", async () => {
    mockedTauriFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B" },
            { id: "local-model", name: "Local Model" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ) as never,
    );

    const provider = createProvider();
    provider.setBaseUrl("https://llm.example.test/v1/");

    await expect(provider.getModels("custom-secret")).resolves.toEqual([
      { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B" },
      { id: "local-model", name: "Local Model" },
    ]);

    expect(mockedTauriFetch).toHaveBeenCalledWith("https://llm.example.test/v1/models", {
      method: "GET",
      headers: {
        Accept: "text/event-stream, application/json",
        Authorization: "Bearer custom-secret",
        "Content-Type": "application/json",
      },
    });
  });

  it("normalizes endpoint suffixes and accepts alternate model payloads", async () => {
    mockedTauriFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          models: [
            { id: "custom-a" },
            { id: "custom-a", name: "Duplicate" },
            { id: "custom-b", name: " Custom B " },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ) as never,
    );

    const provider = createProvider();
    provider.setBaseUrl("https://llm.example.test/v1/chat/completions/");

    await expect(provider.getModels("  custom-secret  ")).resolves.toEqual([
      { id: "custom-a", name: "custom-a" },
      { id: "custom-b", name: "Custom B" },
    ]);
    expect(provider.buildUrl()).toBe("https://llm.example.test/v1/chat/completions");
    expect(mockedTauriFetch).toHaveBeenCalledWith("https://llm.example.test/v1/models", {
      method: "GET",
      headers: {
        Accept: "text/event-stream, application/json",
        Authorization: "Bearer custom-secret",
        "Content-Type": "application/json",
      },
    });
  });

  it("rejects invalid endpoints and exposes provider HTTP errors", async () => {
    const provider = createProvider();
    provider.setBaseUrl("not-a-url");
    expect(() => provider.buildUrl()).toThrow("must be a valid URL");

    mockedTauriFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "invalid API key" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }) as never,
    );
    provider.setBaseUrl("https://llm.example.test/v1");
    await expect(provider.getModels("bad-key")).rejects.toThrow(
      "Model discovery failed: invalid API key",
    );
  });

  it("builds a compatible streaming request using the selected model ID", () => {
    const provider = createProvider();

    expect(
      provider.buildPayload({
        modelId: "qwen2.5-coder:7b",
        messages: [{ role: "user", content: "test" }],
        maxTokens: 2048,
        temperature: 0.2,
      }),
    ).toMatchObject({
      model: "qwen2.5-coder:7b",
      max_tokens: 2048,
      temperature: 0.2,
      stream: true,
    });
  });
});
