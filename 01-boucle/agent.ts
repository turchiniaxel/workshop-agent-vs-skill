// Étape 1 : un agent écrit à la main avec le SDK client @anthropic-ai/sdk.
// Un agent, c'est un modèle, des outils et une boucle. Ici, tu écris les trois.
//
// Lancer : npm run step1 -- "ta question"
// Le programme s'arrête sur le prochain TODO à compléter, de 1 à 5, dans l'ordre.
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

// --- Échafaudage (fourni) : signale le prochain TODO au lieu de planter ---
class TodoError extends Error {
  constructor(readonly step: number, detail: string) {
    super(`TODO ${step} à compléter : ${detail}`);
  }
}

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
// TODO 1 : complète le schéma de read_file, sur le modèle de listFilesTool.
//   - description : ce que fait l'outil ET quand s'en servir. C'est la seule documentation que lit le modèle.
//   - properties : un paramètre « path », de type string, avec sa propre description (donne un exemple de chemin).
//   - required : « path » est obligatoire.
// Doc : https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
const readFileTool: Anthropic.Tool = {
  name: "read_file",
  description: "",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// TODO 2 : renvoie le contenu texte du fichier « path ».
//   - Passe le chemin par safePath(path) avant toute lecture : c'est lui qui refuse « ../.env ».
//   - Lis le fichier avec readFileSync(chemin, "utf8").
//   - Au-delà de MAX_FILE_CHARS caractères, garde le début et ajoute « [... fichier tronqué] » à la fin.
//   Pas besoin de try/catch : runTool transforme déjà toute exception en résultat d'erreur pour le modèle.
// Doc : https://nodejs.org/api/fs.html#fsreadfilesyncpath-options
function readFile(path: string): string {
  throw new TodoError(2, `readFile("${path}") n'est pas encore écrit.`);
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
    if (error instanceof TodoError) throw error; // échafaudage : un TODO manquant arrête le programme
    const message = error instanceof ToolError ? error.message : `Erreur : ${(error as Error).message}`;
    return { content: message, is_error: true };
  }
}

// --- Le modèle ---
// TODO 3 : envoie la conversation au modèle et renvoie sa réponse.
//   Appelle client.messages.create avec cinq champs : model (MODEL), max_tokens (MAX_TOKENS),
//   system (SYSTEM), tools et messages.
//   L'API ne garde aucune mémoire d'un appel à l'autre : messages doit contenir TOUTE la conversation.
// Doc : https://platform.claude.com/docs/en/api/messages
async function askModel(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  throw new TodoError(3, "askModel() n'appelle pas encore le modèle.");
}

// --- Les appels d'outils ---
// TODO 4 : exécute chaque bloc « tool_use » de la réponse et renvoie un « tool_result » pour chacun.
//   - Parcours content : il peut contenir du texte avant les tool_use, ignore les blocs dont le type n'est pas "tool_use".
//   - Affiche l'appel au fil de l'eau, par exemple : → read_file({"path":"src/index.ts"})
//   - Exécute runTool(block.name, block.input).
//   - Fabrique { type: "tool_result", tool_use_id: block.id, content, is_error }.
//   Le tool_use_id relie chaque résultat à sa demande. Si le modèle demande deux outils dans le même tour,
//   il attend deux tool_result : un oubli, et l'API répond par une erreur 400.
// Doc : https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
function executeToolCalls(content: Anthropic.ContentBlock[]): Anthropic.ToolResultBlockParam[] {
  throw new TodoError(4, "executeToolCalls() n'exécute pas encore les outils.");
}

// --- Affichage de la réponse finale (fourni) ---
function printAnswer(content: Anthropic.ContentBlock[]): void {
  for (const block of content) {
    if (block.type === "text") console.log(`\n${block.text}`);
  }
}

// --- Vérification de progression (fourni) : contrôle les TODO 1 et 2 avant d'appeler l'API ---
function checkProgress(): void {
  const props = readFileTool.input_schema.properties as Record<string, unknown> | null | undefined;
  if (!readFileTool.description || !props?.path || !readFileTool.input_schema.required?.includes("path")) {
    throw new TodoError(1, "le schéma de read_file est incomplet (description, paramètre « path », required).");
  }
  readFile("README.md"); // lève TodoError(2) tant que readFile n'est pas écrit
}

// --- La boucle ---
// TODO 5 : transforme ce premier essai en boucle.
//   Pour l'instant, main() fait UN seul aller-retour avec le modèle et affiche ce qu'il renvoie : lance-le une fois
//   pour observer stop_reason et les blocs tool_use. Remplace ensuite l'essai par la boucle de l'agent :
//
//     messages = [la question]
//     répéter au plus MAX_TURNS fois :
//       response = askModel(messages)
//       ajouter { role: "assistant", content: response.content } à messages
//       si response.stop_reason ne vaut pas "tool_use" : printAnswer(response.content), puis terminer
//       ajouter { role: "user", content: executeToolCalls(response.content) } à messages
//     plafond atteint : l'afficher et sortir avec process.exitCode = 1
//
// Doc : https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
async function main(): Promise<void> {
  checkProgress();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  // Premier essai : un seul tour, pour voir ce que renvoie le modèle.
  const response = await askModel(messages);
  console.log(`stop_reason : ${response.stop_reason}`);
  // Les blocs « thinking » (le raisonnement du modèle, chiffré) sont masqués ici : longs et illisibles.
  console.dir(response.content.filter((block) => block.type !== "thinking"), { depth: null });
  if (response.stop_reason === "tool_use") {
    console.log("\ntool_result à renvoyer au modèle :");
    console.dir(executeToolCalls(response.content), { depth: null });
  }
  throw new TodoError(5, "main() ne fait qu'un tour. Écris la boucle pour que l'agent aille jusqu'à la réponse.");
}

main().catch((error) => {
  if (error instanceof TodoError) {
    console.log(`\n${error.message}\nIndices : 01-boucle/ENONCE.md, section « TODO ${error.step} ».`);
    return;
  }
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
