import { describe, expect, it, vi } from "vite-plus/test";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  DEFAULT_NVIDIA_MODEL_ID,
  NVIDIA_BASE_URL,
  NvidiaProvider,
} from "@/features/ai/services/providers/nvidia-provider";

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

const mockedTauriFetch = vi.mocked(tauriFetch);

function createProvider() {
  return new NvidiaProvider({
    id: "nvidia",
    name: "NVIDIA NIM",
    apiUrl: `${NVIDIA_BASE_URL}/chat/completions`,
    requiresApiKey: true,
    maxTokens: 131072,
  });
}

describe("NVIDIA NIM provider", () => {
  it("keeps chat models, removes non-chat services, deduplicates IDs, and formats names", async () => {
    mockedTauriFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: "meta/llama-3.1-8b-instruct", max_context_length: 131072 },
            { id: "nvidia/embed-qa-4", name: "Embedding" },
            { id: "meta/llama-3.1-8b-instruct", name: "Duplicate" },
            { id: "deepseek-ai/deepseek-v3", name: "DeepSeek V3" },
            { id: "vendor/translation-service", name: "Translation" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ) as never,
    );

    await expect(createProvider().getModels("  nvapi-secret  ")).resolves.toEqual([
      { id: "deepseek-ai/deepseek-v3", name: "DeepSeek V3" },
      {
        id: "meta/llama-3.1-8b-instruct",
        name: "Llama 3.1 8B Instruct",
        maxTokens: 131072,
      },
    ]);

    expect(mockedTauriFetch).toHaveBeenCalledWith(`${NVIDIA_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream, application/json",
        Authorization: "Bearer nvapi-secret",
        "Content-Type": "application/json",
      },
    });
  });

  it("uses the canonical fallback model and reports auth failures", async () => {
    const provider = createProvider();
    expect(DEFAULT_NVIDIA_MODEL_ID).toBe("meta/llama-3.1-8b-instruct");
    expect(provider.buildUrl()).toBe(`${NVIDIA_BASE_URL}/chat/completions`);
    expect(provider.buildHeaders("  key  ").Authorization).toBe("Bearer key");
    expect(provider.buildHeaders("   ").Authorization).toBeUndefined();

    mockedTauriFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "invalid api key" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }) as never,
    );
    await expect(provider.getModels("bad-key")).rejects.toThrow(
      "NVIDIA model discovery failed: invalid api key",
    );
  });
});
