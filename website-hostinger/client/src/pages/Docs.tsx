/**
 * Quiet Command Center: documentation is an editorial workbench with durable navigation,
 * warm reading surfaces, graphite rules, and Coodi Signal Blue for active wayfinding.
 */
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  MonitorDown,
  PanelLeft,
  Sparkles,
} from "lucide-react";

const docSections = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick start" },
  { id: "providers", label: "Providers & models" },
  { id: "keys", label: "Keys & local models" },
  { id: "agents", label: "Agent workflows" },
  { id: "downloads", label: "Downloads" },
];

const providerRows = [
  ["Anthropic", "Claude models", "API key"],
  ["OpenAI", "GPT models", "API key"],
  ["Google Gemini", "Gemini models", "API key"],
  ["xAI Grok", "Grok models", "API key"],
  ["OpenRouter", "Live catalog + model ID", "API key optional for catalog"],
  ["NVIDIA NIM", "Live catalog", "API key"],
  ["Ollama", "Installed local models", "Local or cloud key"],
  ["Custom", "Any OpenAI-compatible model ID", "Endpoint key optional"],
];

function CoodiMark({ className = "" }: { className?: string }) {
  return (
    <img
      src="/manus-storage/coodi-mark_d8869206.png"
      alt="Coodi"
      className={`object-contain ${className}`}
    />
  );
}

function CoodiWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex font-['Space_Grotesk'] font-semibold leading-none tracking-[0.07em] ${className}`} aria-label="Coodi">
      <span>c</span><span className="ml-[0.02em]">o</span><span className="relative ml-[0.025em] inline-block"><span>o</span><i className="absolute right-[0.02em] top-[0.1em] h-[0.75em] w-[0.14em] bg-current" /></span><span className="ml-[0.02em]">di</span>
    </span>
  );
}

function DocsNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d9d5cc] bg-[#f5f3ee]/92 backdrop-blur-xl">
      <div className="flex h-15 items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Coodi home">
          <CoodiMark className="size-9 transition-transform duration-200 group-hover:-rotate-6" />
          <CoodiWordmark className="text-[1.15rem] tracking-[0.07em] text-[#17171a]" />
        </Link>
        <div className="hidden items-center gap-5 text-sm text-[#5c5b60] md:flex">
          <a href="#quick-start" className="transition-colors hover:text-[#17171a]">Getting started</a>
          <a href="#providers" className="transition-colors hover:text-[#17171a]">AI configuration</a>
          <a href="#downloads" className="transition-colors hover:text-[#17171a]">Downloads</a>
        </div>
        <a
          href="https://github.com/imubashirhassanpk/coodi/releases/download/v0.11.2/Coodi_0.11.2_x64-setup.exe"
          className="inline-flex items-center gap-2 rounded-md bg-[#17171a] px-3.5 py-2 text-sm font-medium text-[#f9f8f4] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Download className="size-3.5" />
          Get Coodi
        </a>
      </div>
    </header>
  );
}

export default function Docs() {
  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#17171a]">
      <DocsNav />
      <div className="mx-auto grid max-w-[1550px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_210px]">
        <aside className="border-b border-[#d9d5cc] px-5 py-7 lg:sticky lg:top-15 lg:h-[calc(100vh-60px)] lg:border-r lg:border-b-0 lg:px-7">
          <div className="mb-5 flex items-center gap-2 font-['IBM_Plex_Mono'] text-[0.67rem] font-medium uppercase tracking-[0.13em] text-[#77747a]">
            <PanelLeft className="size-3.5" /> Documentation
          </div>
          <nav aria-label="Documentation sections" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {docSections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`shrink-0 border-l-2 px-3 py-2 text-sm transition-colors ${index === 0 ? "border-[#2f6bff] bg-[#e8efff] font-medium text-[#214fb6]" : "border-transparent text-[#56545a] hover:border-[#b6b3ad] hover:bg-[#e7e3db] hover:text-[#17171a]"}`}
              >
                {section.label}
              </a>
            ))}
          </nav>
          <div className="mt-9 hidden border-t border-[#d9d5cc] pt-5 lg:block">
            <p className="font-['IBM_Plex_Mono'] text-[0.65rem] uppercase tracking-[0.13em] text-[#77747a]">Need a hand?</p>
            <a href="mailto:hey@www.mubashirhassan.com" className="mt-2 inline-flex items-center gap-1 text-sm text-[#2f6bff] hover:underline">
              Contact support <ArrowRight className="size-3.5" />
            </a>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
          <section id="overview" className="max-w-3xl scroll-mt-24">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] font-medium uppercase tracking-[0.15em] text-[#2f6bff]">Coodi / documentation / 00</p>
            <h1 className="mt-4 max-w-2xl font-['Space_Grotesk'] text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-6xl">
              Build with the model you choose.
            </h1>
            <p className="mt-7 max-w-2xl font-['Source_Serif_4'] text-xl leading-8 text-[#4f4d53]">
              Coodi keeps your editor, provider selection, model control, and agent workflow in one focused desktop environment.
            </p>
            <div className="mt-8 grid border-y border-[#d9d5cc] font-['IBM_Plex_Mono'] text-[0.62rem] uppercase tracking-[0.1em] text-[#77747a] sm:grid-cols-3"><span className="border-b border-[#d9d5cc] py-3 sm:border-r sm:border-b-0 sm:px-3"><b className="text-[#2f6bff]">Route</b> / docs</span><span className="border-b border-[#d9d5cc] py-3 sm:border-r sm:border-b-0 sm:px-3"><b className="text-[#2f6bff]">Scope</b> / configuration</span><span className="py-3 sm:px-3"><b className="text-[#2f6bff]">Status</b> / maintained</span></div>
            <div className="mt-10 overflow-hidden rounded-lg border border-[#d9d5cc] bg-[#ebe8e0]">
              <img src="/manus-storage/coodi-docs-system_6b27f06b.png" alt="Coodi documentation system illustration" className="aspect-[3/2] w-full object-cover" />
            </div>
          </section>

          <section id="quick-start" className="mt-20 max-w-3xl scroll-mt-24 border-t border-[#d9d5cc] pt-12">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] uppercase tracking-[0.15em] text-[#77747a]">01 / Quick start</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold tracking-[-0.05em]">From download to first prompt.</h2>
            <ol className="mt-8 space-y-5">
              {[
                ["Install Coodi", "Download the current Windows NSIS installer and complete the normal installation flow. macOS packages will follow in a later release."],
                ["Open a workspace", "Use Open Folder to start in an existing project, or create a file directly from the welcome screen."],
                ["Configure your AI", "Open Agent settings, pick a provider, choose a listed model or enter a model ID, then save your key."],
                ["Start an agent session", "Use the Agent menu in the composer to switch provider, model, mode, or installed agent without leaving the task."],
              ].map(([title, detail], index) => (
                <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#17171a] font-['IBM_Plex_Mono'] text-xs text-white">0{index + 1}</span>
                  <div className="pt-0.5">
                    <h3 className="font-['Space_Grotesk'] text-lg font-semibold tracking-[-0.03em]">{title}</h3>
                    <p className="mt-1 font-['Source_Serif_4'] text-lg leading-7 text-[#5b595e]">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="providers" className="mt-20 max-w-3xl scroll-mt-24 border-t border-[#d9d5cc] pt-12">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] uppercase tracking-[0.15em] text-[#77747a]">02 / AI configuration</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold tracking-[-0.05em]">Providers and models are first-class settings.</h2>
            <p className="mt-4 font-['Source_Serif_4'] text-lg leading-7 text-[#5b595e]">
              Select a provider in <strong className="font-semibold text-[#17171a]">Settings → Agent</strong>, then choose a supplied model, a model discovered from the provider, or a precise model identifier. This keeps model changes intentional rather than hidden behind a default.
            </p>
            <div className="mt-8 overflow-hidden rounded-lg border border-[#d9d5cc] bg-[#fbfaf6]">
              <div className="grid grid-cols-[1.1fr_1fr_1.25fr] border-b border-[#d9d5cc] bg-[#eae7df] px-4 py-3 font-['IBM_Plex_Mono'] text-[0.65rem] uppercase tracking-[0.1em] text-[#77747a]">
                <span>Provider</span><span>Model source</span><span>Connection</span>
              </div>
              {providerRows.map(([provider, models, connection]) => (
                <div key={provider} className="grid grid-cols-[1.1fr_1fr_1.25fr] gap-2 border-b border-[#e2ded6] px-4 py-3.5 text-sm last:border-0">
                  <span className="font-medium text-[#17171a]">{provider}</span>
                  <span className="text-[#5b595e]">{models}</span>
                  <span className="text-[#5b595e]">{connection}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-[#bed0ff] bg-[#eef3ff] p-4">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#2f6bff]" />
                <p className="font-['Source_Serif_4'] text-lg leading-7 text-[#3f4f78]">OpenRouter uses its live catalog, while Ollama reads models installed on your machine. If the model you need is new or private, enter its model ID directly in the Model control.</p>
              </div>
            </div>
          </section>

          <section id="keys" className="mt-20 max-w-3xl scroll-mt-24 border-t border-[#d9d5cc] pt-12">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] uppercase tracking-[0.15em] text-[#77747a]">03 / Credentials</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold tracking-[-0.05em]">Keys are separate from provider choice.</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#d9d5cc] bg-[#fbfaf6] p-5">
                <KeyRound className="size-5 text-[#2f6bff]" />
                <h3 className="mt-5 font-['Space_Grotesk'] text-lg font-semibold">Save securely</h3>
                <p className="mt-2 font-['Source_Serif_4'] text-base leading-6 text-[#5b595e]">Open the API Keys action from Agent settings or the composer preferences menu. Saved entries are masked in the interface.</p>
              </div>
              <div className="rounded-lg border border-[#d9d5cc] bg-[#fbfaf6] p-5">
                <MonitorDown className="size-5 text-[#2f6bff]" />
                <h3 className="mt-5 font-['Space_Grotesk'] text-lg font-semibold">Use local models</h3>
                <p className="mt-2 font-['Source_Serif_4'] text-base leading-6 text-[#5b595e]">Choose Ollama, set the local endpoint if necessary, and Coodi will surface the models that endpoint reports.</p>
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-[#17171a] p-5 text-[#f5f3ee]">
              <div className="flex items-center justify-between gap-3 font-['IBM_Plex_Mono'] text-xs text-[#9aa7c9]"><span>SETTINGS PATH</span><Copy className="size-3.5" /></div>
              <code className="mt-3 block font-['IBM_Plex_Mono'] text-sm">Settings → Agent → API Keys</code>
            </div>
          </section>

          <section id="agents" className="mt-20 max-w-3xl scroll-mt-24 border-t border-[#d9d5cc] pt-12">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] uppercase tracking-[0.15em] text-[#77747a]">04 / Agent workflows</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold tracking-[-0.05em]">Switch the decision, not the workspace.</h2>
            <p className="mt-4 font-['Source_Serif_4'] text-lg leading-7 text-[#5b595e]">The composer preferences menu keeps agent, provider, model, API keys, mode, and skills close to the work. Use it to select an installed agent or use Coodi Agent with your selected provider.</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Choose a provider per task", "Switch models from the composer", "Enter an exact model identifier", "Open provider-key management", "Select a supported agent mode", "Return to Settings for full configuration"].map((item) => (
                <li key={item} className="flex items-center gap-2 rounded-md border border-[#d9d5cc] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#414045]"><Check className="size-4 text-[#2f6bff]" />{item}</li>
              ))}
            </ul>
          </section>

          <section id="downloads" className="mt-20 max-w-3xl scroll-mt-24 border-t border-[#d9d5cc] pt-12">
            <p className="font-['IBM_Plex_Mono'] text-[0.7rem] uppercase tracking-[0.15em] text-[#77747a]">05 / Downloads</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold tracking-[-0.05em]">Install Coodi on Windows first.</h2>
            <p className="mt-4 font-['Source_Serif_4'] text-lg leading-7 text-[#5b595e]">Use the current Windows release and its notes. The release workflow is publishing the NSIS installer first; macOS and Linux packages are intentionally deferred to later releases.</p>
            <a href="https://github.com/imubashirhassanpk/coodi/releases/download/v0.11.2/Coodi_0.11.2_x64-setup.exe" className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#2f6bff] px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <Download className="size-4" /> View current downloads <ChevronRight className="size-4" />
            </a>
          </section>
        </main>

        <aside className="hidden px-7 py-16 lg:block">
          <div className="sticky top-31 border-l border-[#d9d5cc] pl-5">
            <p className="font-['IBM_Plex_Mono'] text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#77747a]">On this page</p>
            <div className="mt-4 space-y-3">
              {docSections.map((section) => <a key={section.id} href={`#${section.id}`} className="block text-sm text-[#66636a] transition-colors hover:text-[#2f6bff]">{section.label}</a>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
