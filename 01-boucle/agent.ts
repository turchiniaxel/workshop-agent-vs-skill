// Étape 1 : un agent écrit à la main avec le SDK client @anthropic-ai/sdk.
// Un agent, c'est un modèle, des outils et une boucle. Ici, tu écris les trois.
//
// Lancer : npm run step1 -- "ta question"
// Énoncé, indices et liens de doc : 01-boucle/ENONCE.md

import Anthropic from "@anthropic-ai/sdk";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { MODEL, SAMPLE_REPO, requireApiKey } from "../shared/config.js";

requireApiKey();
const client = new Anthropic(); // lit ANTHROPIC_API_KEY, chargée depuis .env par shared/config.ts
const question = process.argv[2] ?? "Que fait ce projet ?";
const MAX_TURNS = 10; // garde-fou : sans plafond, un agent peut boucler et consommer des tokens sans fin
const MAX_TOKENS = 2048; // longueur maximale d'UNE réponse du modèle
const MAX_FILE_CHARS = 8000; // chaque tour renvoie tout l'historique : un gros fichier coûte à chaque tour
const SYSTEM = "Tu réponds en français à des questions sur un dépôt de code. Explore-le avec tes outils au lieu de deviner.";

// --- Confinement (fourni) : tout chemin doit rester dans sample-repo/ ---
// Les chemins viennent du modèle : on ne leur fait pas confiance. « ../.env » doit être refusé.
class ToolError extends Error {}

function safePath(path: string): string {
  const full = resolve(SAMPLE_REPO, path);
  const rel = relative(SAMPLE_REPO, full);
  if (rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new ToolError(`Chemin refusé : « ${path} » sort du dépôt analysé.`);
  }
  return full;
}

// --- Outil 1 : list_files (fourni, sers-t'en de modèle) ---
// Un outil a deux faces :
//   - le schéma (ci-dessous), envoyé au modèle : il lui dit que l'outil existe, à quoi il sert et quels arguments donner ;
//   - le code (listFiles), exécuté par TON programme quand le modèle demande l'outil. Le modèle n'exécute jamais rien.
const listFilesTool: Anthropic.Tool = {
  name: "list_files",
  description:
    "Liste les fichiers et dossiers d'un dossier du dépôt. Les dossiers se terminent par « / ». " +
    "À utiliser pour découvrir la structure du projet avant de lire des fichiers.",
  input_schema: {
    // Un JSON Schema : le modèle produit des arguments qui respectent cette forme.
    type: "object",
    properties: {
      dir: { type: "string", description: "Dossier relatif à la racine du dépôt, par exemple « src ». « . » pour la racine." },
    },
    required: ["dir"],
  },
};

function listFiles(dir: string): string {
  const entries = readdirSync(safePath(dir), { withFileTypes: true });
  return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).join("\n");
}

// --- Outil 2 : read_file ---
// TODO 1 : le schéma de read_file
const readFileTool: Anthropic.Tool = {
  name: "read_file",
  description:
    "Renvoie le contenu texte d'un fichier du dépôt. Les fichiers très longs sont tronqués. " +
    "À utiliser une fois le chemin connu grâce à list_files.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Chemin du fichier relatif à la racine du dépôt, par exemple « src/index.ts »." },
    },
    required: ["path"],
  },
};

// TODO 2 : le code de read_file
function readFile(path: string): string {
  const text = readFileSync(safePath(path), "utf8");
  return text.length > MAX_FILE_CHARS ? `${text.slice(0, MAX_FILE_CHARS)}\n[... fichier tronqué]` : text;
}

const tools: Anthropic.Tool[] = [listFilesTool, readFileTool];

// --- Exécution d'un outil (fourni) ---
// Une erreur d'outil n'arrête pas l'agent : elle repart vers le modèle avec is_error: true,
// et le modèle peut se corriger (essayer un autre chemin, expliquer le refus...).
function runTool(name: string, input: unknown): { content: string; is_error: boolean } {
  try {
    const args = input as { dir?: string; path?: string };
    if (name === "list_files") return { content: listFiles(args.dir ?? "."), is_error: false };
    if (name === "read_file") return { content: readFile(args.path ?? ""), is_error: false };
    return { content: `Outil inconnu : ${name}`, is_error: true };
  } catch (error) {
    const message = error instanceof ToolError ? error.message : `Erreur : ${(error as Error).message}`;
    return { content: message, is_error: true };
  }
}

// --- Le modèle ---
// TODO 3 : l'appel au modèle, avec toute la conversation
async function askModel(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  return client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, tools, messages });
}

// --- Les appels d'outils ---
// TODO 4 : un tool_result pour chaque tool_use, relié par son tool_use_id
function executeToolCalls(content: Anthropic.ContentBlock[]): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    console.log(`→ ${block.name}(${JSON.stringify(block.input)})`);
    const { content, is_error } = runTool(block.name, block.input);
    results.push({ type: "tool_result", tool_use_id: block.id, content, is_error });
  }
  return results;
}

// --- Affichage de la réponse finale (fourni) ---
function printAnswer(content: Anthropic.ContentBlock[]): void {
  for (const block of content) {
    if (block.type === "text") console.log(`\n${block.text}`);
  }
}

// --- La boucle ---
// TODO 5 : la boucle
async function main(): Promise<void> {
  // L'historique complet, renvoyé à chaque tour : l'API ne se souvient de rien.
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await askModel(messages);
    messages.push({ role: "assistant", content: response.content });

    // Le modèle ne demande plus d'outil : c'est sa réponse finale.
    if (response.stop_reason !== "tool_use") {
      printAnswer(response.content);
      return;
    }

    // Tous les tool_result du tour repartent ensemble, dans un seul message user.
    messages.push({ role: "user", content: executeToolCalls(response.content) });
  }
  console.log(`\nPlafond de ${MAX_TURNS} tours atteint sans réponse finale.`);
  process.exitCode = 1;
}

main().catch((error) => {
  if (error instanceof Anthropic.RateLimitError) {
    console.error("Limite de débit partagée atteinte (429) : la salle utilise la clé en même temps. Attends quelques secondes et relance.");
  } else if (error instanceof Anthropic.BadRequestError) {
    console.error(`Requête refusée par l'API (400) : ${error.message}`);
    console.error("Souvent : un tool_use sans son tool_result, ou un message assistant oublié dans l'historique. Voir « Erreurs fréquentes » dans 01-boucle/ENONCE.md.");
  } else {
    console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
});
