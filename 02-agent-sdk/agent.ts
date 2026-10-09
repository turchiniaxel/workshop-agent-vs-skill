// Étape 2 : le même agent avec le Claude Agent SDK.
// Le SDK fournit la boucle ET les outils (Read, Glob, Grep...) : il te reste à les configurer.
//
// Lancer : npm run step2 -- "ta question"
// Voir tout ce qui circule dans le flux : npm run step2 -- "ta question" --verbose
// Énoncé, indices et liens de doc : 02-agent-sdk/ENONCE.md

import { type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
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

// TODO 3 (après les TODO 1 et 2) : écris ton propre outil de lecture, my_read, et remplace Read par lui.
//   - Ajoute tool et createSdkMcpServer à l'import de "@anthropic-ai/claude-agent-sdk", et import { z } from "zod".
//   - tool(nom, description, schéma, handler) : nom "my_read", une description comme celle de read_file à l'étape 1,
//     le schéma est un objet de champs zod ({ path: z.string().describe("...") }).
//   - Le handler reçoit { path } : lis le fichier avec safePath, tronque à MAX_FILE_CHARS, et renvoie
//     { content: [{ type: "text", text: ... }] }. En cas d'erreur, renvoie le message avec isError: true.
//   - createSdkMcpServer({ name: "workshop", tools: [ton outil] }) : un serveur MCP qui tourne dans ton process.
//   - Dans options : retire "Read" de tools, ajoute mcpServers: { workshop: ... },
//     et ajoute "mcp__workshop__my_read" à allowedTools.
// Doc : https://code.claude.com/docs/en/agent-sdk/custom-tools

// TODO 1 : remplis l'objet d'options. Chaque option remplace un morceau que tu as écrit à la main à l'étape 1.
//   - cwd            : SAMPLE_REPO, le dossier où travaille l'agent. Remplace le rôle de safePath.
//   - model          : MODEL
//   - tools          : les outils intégrés qui EXISTENT pour le modèle. Lesquels remplacent list_files et read_file ?
//                      Il en faut trois (liste des outils intégrés : voir ENONCE.md).
//   - allowedTools   : les outils pré-approuvés, qui s'exécutent sans demande de permission. Les mêmes trois.
//   - settingSources : [], pour ignorer ~/.claude/ et la config du projet : l'agent part de zéro.
//   - persistSession : false, pour ne laisser aucune session sur le disque.
//   - maxTurns       : 10. Remplace ton MAX_TURNS.
// Doc : https://code.claude.com/docs/en/agent-sdk/typescript (type Options)
const options: Options = {};

// TODO 2 : lance l'agent et affiche le flux.
//   - Ajoute query à l'import de "@anthropic-ai/claude-agent-sdk", en haut du fichier.
//   - query({ prompt: question, options }) renvoie un flux asynchrone : parcours-le avec for await
//     et passe chaque message à show(). Ces trois lignes remplacent toute la boucle de l'étape 1.
// Doc : https://code.claude.com/docs/en/agent-sdk/agent-loop
async function main(): Promise<void> {
  if (!options.tools) {
    console.log("TODO 1 à compléter : l'objet options est vide.\nIndices : 02-agent-sdk/ENONCE.md, section « TODO 1 ».");
    return;
  }
  console.log(`TODO 2 à compléter : query() n'est pas encore appelé. Question reçue : « ${question} »`);
  console.log("Indices : 02-agent-sdk/ENONCE.md, section « TODO 2 ».");
}

main().catch((error) => {
  console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
