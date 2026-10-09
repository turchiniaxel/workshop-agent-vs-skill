import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// L'Agent SDK ne charge pas les fichiers .env : on le fait ici, avant tout appel.
config({ path: resolve(ROOT, ".env"), quiet: true });

export const MODEL = process.env.WORKSHOP_MODEL || "claude-haiku-5-5";
export const SAMPLE_REPO = resolve(ROOT, "sample-repo");
export const SAMPLE_DATA = resolve(ROOT, "sample-data");

export const MISSING_KEY_MESSAGE = [
  "Clé API introuvable : la variable ANTHROPIC_API_KEY est vide.",
  "  1. Copie le modèle :  cp .env.example .env",
  "  2. Ouvre .env et colle la clé fournie en séance après ANTHROPIC_API_KEY=",
  "  3. Relance la commande.",
].join("\n");

export function getApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

// À appeler en tête d'un agent : explique le problème en français puis s'arrête proprement.
export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    console.error(MISSING_KEY_MESSAGE);
    process.exit(1);
  }
  return key;
}
