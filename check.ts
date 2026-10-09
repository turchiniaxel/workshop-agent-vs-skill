import Anthropic from "@anthropic-ai/sdk";
import { query, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { MISSING_KEY_MESSAGE, MODEL, SAMPLE_REPO, getApiKey } from "./shared/config.js";

type Result = { ok: boolean; detail: string };

function report(label: string, result: Result): boolean {
  console.log(`${result.ok ? "OK" : "KO"}  ${label} : ${result.detail}`);
  return result.ok;
}

function explain(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) return "clé refusée par l'API. Vérifie ANTHROPIC_API_KEY dans .env (pas d'espace ni de guillemets).";
    if (error.status === 404) return `modèle « ${MODEL} » introuvable. Corrige WORKSHOP_MODEL dans .env.`;
    if (error.status === 429) return "limite de débit atteinte (clé partagée). Attends quelques secondes et relance.";
    return `erreur API ${error.status ?? ""} : ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "API injoignable. Vérifie ta connexion réseau.";
  }
  return error instanceof Error ? error.message : String(error);
}

function explainResult(message: SDKResultMessage): string {
  const text = message.subtype === "success" ? message.result : message.subtype;
  if (/api key|authenticat|401|logged in/i.test(text)) {
    return "clé refusée par l'Agent SDK. Vérifie ANTHROPIC_API_KEY dans .env.";
  }
  return `query() a échoué (${text}). Relance, puis préviens l'animateur si cela persiste.`;
}

function checkNode(): Result {
  const major = Number(process.versions.node.split(".")[0]);
  return major >= 18
    ? { ok: true, detail: `Node.js ${process.versions.node}` }
    : { ok: false, detail: `Node.js ${process.versions.node} est trop ancien. Installe la version 18 ou plus (https://nodejs.org).` };
}

function checkKey(): Result {
  return getApiKey()
    ? { ok: true, detail: "ANTHROPIC_API_KEY présente" }
    : { ok: false, detail: `ANTHROPIC_API_KEY absente.\n${MISSING_KEY_MESSAGE}` };
}

async function checkMessages(): Promise<Result> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "Réponds par le mot OK." }],
    });
    return { ok: true, detail: `appel messages.create réussi (${response.model})` };
  } catch (error) {
    return { ok: false, detail: explain(error) };
  }
}

async function checkAgentSdk(): Promise<Result> {
  try {
    for await (const message of query({
      prompt: "Réponds par le mot OK.",
      options: {
        cwd: SAMPLE_REPO,
        model: MODEL,
        tools: [],
        settingSources: [],
        persistSession: false,
        maxTurns: 1,
      },
    })) {
      if (message.type === "result") {
        return message.subtype === "success" && !message.is_error
          ? { ok: true, detail: "appel query() réussi (binaire Claude Code présent)" }
          : { ok: false, detail: explainResult(message) };
      }
    }
    return { ok: false, detail: "query() n'a renvoyé aucun résultat." };
  } catch (error) {
    return {
      ok: false,
      detail: `${explain(error)}\n    Si le binaire manque, relance « npm install » sans l'option --omit=optional.`,
    };
  }
}

const results: boolean[] = [];
results.push(report("Node.js", checkNode()));
const keyOk = report("Clé API", checkKey());
results.push(keyOk);

if (keyOk) {
  results.push(report("SDK client", await checkMessages()));
  results.push(report("Agent SDK", await checkAgentSdk()));
} else {
  results.push(report("SDK client", { ok: false, detail: "ignoré, la clé API manque." }));
  results.push(report("Agent SDK", { ok: false, detail: "ignoré, la clé API manque." }));
}

if (results.every(Boolean)) {
  console.log("\nTout est prêt.");
} else {
  console.log("\nCorrige les lignes KO, puis relance « npm run check ».");
  process.exitCode = 1;
}
