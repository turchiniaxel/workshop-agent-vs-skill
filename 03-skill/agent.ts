// Étape 3 : ajouter un skill à l'agent de l'étape 2.
// Le skill apporte le savoir-faire (des règles, une méthode, un format), l'agent apporte l'exécution.
//
// Lancer : npm run step3 -- "Fais une revue de code de ce projet"
// Voir le skill injecté dans la conversation : ajoute --verbose
// Énoncé, indices et liens de doc : 03-skill/ENONCE.md

import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { MODEL, SAMPLE_REPO, requireApiKey } from "../shared/config.js";

requireApiKey();
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const question = args.find((arg) => !arg.startsWith("--")) ?? "Fais une revue de code de ce projet";
const SKILL_NAME = "revue-de-code"; // change-le si ton skill porte un autre nom

// --- Diagnostic (fourni) : explique pourquoi le skill n'est pas utilisable ---
function diagnose(discovered: string[]): string | undefined {
  if (!options.settingSources?.includes("project")) {
    return 'settingSources ne contient pas "project" : le SDK ne lit pas le dossier .claude/ du repo (TODO 1).';
  }
  if (!discovered.includes(SKILL_NAME)) {
    return `aucun fichier .claude/skills/${SKILL_NAME}/SKILL.md trouvé, ou son frontmatter est invalide (TODO 2).`;
  }
  if (!(Array.isArray(options.tools) && options.tools.includes("Skill"))) {
    return 'le skill est trouvé, mais "Skill" manque dans tools : le modèle ne peut pas l\'invoquer de lui-même (TODO 1).';
  }
  if (!(Array.isArray(options.skills) && options.skills.includes(SKILL_NAME))) {
    return "le skill est trouvé, mais options.skills ne le nomme pas : le modèle peut lui préférer un skill embarqué comme code-review (TODO 1).";
  }
  return undefined;
}

// --- Affichage (fourni) : skills découverts, appels d'outils, réponse finale ---
function show(message: SDKMessage): void {
  if (VERBOSE) console.log(`\x1b[2m[${message.type}${"subtype" in message ? `/${message.subtype}` : ""}]\x1b[0m`);

  if (message.type === "system" && message.subtype === "init") {
    // message.skills liste tout ce que le SDK a découvert, y compris les skills embarqués de Claude Code.
    // options.skills filtre ce que le modèle a le droit de voir et d'invoquer.
    console.log(`Skills découverts par le SDK : ${message.skills.join(", ") || "aucun"}`);
    const problem = diagnose(message.skills);
    if (problem) {
      console.log(`Skill « ${SKILL_NAME} » pas encore utilisable : ${problem}\nIndices : 03-skill/ENONCE.md\n`);
    } else {
      console.log(`Skill activé pour le modèle : ${SKILL_NAME}\n`);
    }
  } else if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "tool_use") {
        const marque = block.name === "Skill" ? "★ Skill invoqué" : "→";
        console.log(`${marque} ${block.name}(${JSON.stringify(block.input)})`);
      } else if (VERBOSE && block.type === "text") {
        console.log(`\x1b[2m  texte : ${block.text.slice(0, 200)}\x1b[0m`);
      }
    }
  } else if (message.type === "user" && VERBOSE) {
    // Juste après un appel à Skill, un message user contient le corps de ton SKILL.md : c'est là qu'il entre dans le contexte.
    console.log(`\x1b[2m  ${JSON.stringify(message.message.content).slice(0, 400)}…\x1b[0m`);
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

// TODO 1 : trois changements d'options par rapport à l'étape 2 (on repart du Read intégré, sans my_read).
//   - tools          : ajoute "Skill". C'est l'outil qui permet au modèle d'invoquer un skill de lui-même.
//   - settingSources : ["project"] au lieu de [], pour que le SDK lise .claude/skills/ du repo (pas ~/.claude/).
//   - skills         : [SKILL_NAME], le seul skill que le modèle a le droit de voir. Claude Code embarque
//                      les siens, dont un « code-review » qu'il pourrait préférer au tien.
// TODO 2 : écris le skill dans .claude/skills/<nom>/SKILL.md, à la racine du repo.
//   Un modèle à copier t'attend dans 03-skill/SKILL.modele.md.
// Doc : https://code.claude.com/docs/en/agent-sdk/skills
const options: Options = {
  cwd: SAMPLE_REPO, // le SDK cherche .claude/skills/ ici et dans les dossiers parents
  model: MODEL,
  tools: ["Read", "Glob", "Grep"],
  allowedTools: ["Read", "Glob", "Grep"],
  settingSources: [],
  persistSession: false,
  maxTurns: 10,
};

async function main(): Promise<void> {
  for await (const message of query({ prompt: question, options })) {
    show(message);
  }
}

main().catch((error) => {
  console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
