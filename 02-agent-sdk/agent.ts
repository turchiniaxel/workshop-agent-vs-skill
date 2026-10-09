// Étape 2 : le même agent avec le Claude Agent SDK.
// Le SDK fournit la boucle ET les outils (Read, Glob, Grep...) : il te reste à les configurer.
//
// Lancer : npm run step2 -- "ta question"
// Voir tout ce qui circule dans le flux : npm run step2 -- "ta question" --verbose
// Énoncé, indices et liens de doc : 02-agent-sdk/ENONCE.md

import { createSdkMcpServer, query, tool, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { z } from "zod";
import { MODEL, SAMPLE_REPO, requireApiKey } from "../shared/config.js";

requireApiKey();
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const question = args.find((arg) => !arg.startsWith("--")) ?? "Que fait ce projet ?";

// --- Affichage (fourni) : chaque appel d'outil, puis la réponse finale ---
// query() renvoie un flux de messages. Les principaux :
//   system/init  → la session démarre : modèle, outils disponibles, skills découverts
//   assistant    → une réponse du modèle : du texte et/ou des blocs tool_use (comme à l'étape 1)
//   user         → les tool_result, fabriqués par le SDK cette fois, pas par toi
//   result       → la fin : la réponse finale, le nombre de tours, le coût
function show(message: SDKMessage): void {
  if (VERBOSE) console.log(`\x1b[2m[${message.type}${"subtype" in message ? `/${message.subtype}` : ""}]\x1b[0m`);

  if (message.type === "system" && message.subtype === "init") {
    if (VERBOSE) console.log(`\x1b[2m  modèle : ${message.model} · outils : ${message.tools.join(", ")}\x1b[0m`);
  } else if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "tool_use") console.log(`→ ${block.name}(${JSON.stringify(block.input)})`);
      else if (VERBOSE && block.type === "text") console.log(`\x1b[2m  texte : ${block.text.slice(0, 200)}\x1b[0m`);
    }
  } else if (message.type === "user" && VERBOSE) {
    console.log(`\x1b[2m  ${JSON.stringify(message.message.content).slice(0, 300)}…\x1b[0m`);
  } else if (message.type === "result") {
    if (message.subtype === "success" && !message.is_error) {
      console.log(`\n${message.result}`);
    } else {
      console.error(`\nL'agent s'est arrêté (${message.subtype}) : ${"result" in message ? message.result : ""}`);
      process.exitCode = 1;
    }
    if (VERBOSE) {
      const { input_tokens, cache_read_input_tokens, cache_creation_input_tokens } = message.usage;
      const input = input_tokens + cache_read_input_tokens + cache_creation_input_tokens;
      console.log(`\x1b[2m\n${message.num_turns} tours · ${message.duration_ms} ms · ${message.total_cost_usd.toPrecision(2)} $`);
      console.log(`${input} tokens en entrée, dont ${cache_read_input_tokens} relus depuis le cache\x1b[0m`);
    }
  }
}

// --- Confinement (fourni, repris de l'étape 1) : tout chemin doit rester dans sample-repo/ ---
const MAX_FILE_CHARS = 8000;

function safePath(path: string): string {
  const full = resolve(SAMPLE_REPO, path);
  const rel = relative(SAMPLE_REPO, full);
  if (rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error(`Chemin refusé : « ${path} » sort du dépôt analysé.`);
  }
  return full;
}

// TODO 3 : ton propre outil de lecture, qui remplace Read
const myReadTool = tool(
  "my_read",
  "Renvoie le contenu texte d'un fichier du dépôt. Les fichiers très longs sont tronqués. " +
    "À utiliser une fois le chemin connu grâce à Glob ou Grep.",
  { path: z.string().describe("Chemin du fichier, relatif à la racine du dépôt (par exemple « src/index.ts ») ou absolu.") },
  async ({ path }) => {
    try {
      const text = readFileSync(safePath(path), "utf8");
      const content = text.length > MAX_FILE_CHARS ? `${text.slice(0, MAX_FILE_CHARS)}\n[... fichier tronqué]` : text;
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      // Comme à l'étape 1 : l'erreur repart au modèle (is_error), elle ne fait pas planter l'agent
      return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true };
    }
  },
);

// Un serveur MCP qui tourne dans ton process : pas de binaire, pas de port
const workshopServer = createSdkMcpServer({ name: "workshop", tools: [myReadTool] });

// TODO 1 : les options de l'agent (TODO 3 : Read remplacé par my_read)
const options: Options = {
  cwd: SAMPLE_REPO, // l'agent travaille dans sample-repo/
  model: MODEL,
  tools: ["Glob", "Grep"], // les seuls outils intégrés : Read est retiré, my_read le remplace
  mcpServers: { workshop: workshopServer }, // tes outils à toi, hors de la liste tools
  allowedTools: ["Glob", "Grep", "mcp__workshop__my_read"], // un outil MCP s'appelle mcp__<serveur>__<outil>
  settingSources: [], // ni ~/.claude/ ni la config du projet
  persistSession: false, // aucune session écrite sur le disque
  maxTurns: 10,
};

// TODO 2 : l'appel à query(), qui remplace toute la boucle de l'étape 1
async function main(): Promise<void> {
  for await (const message of query({ prompt: question, options })) {
    show(message);
  }
}

main().catch((error) => {
  console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
