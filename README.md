# Workshop Skill vs Agent

Atelier de 2 h du Club IA : tu repars avec un agent que tu as écrit toi-même, d'abord à la main avec le SDK client, puis avec le Claude Agent SDK, et avec un skill que tu lui as ajouté. Tout est en TypeScript, en lecture seule : rien ne modifie ton poste.

## Prérequis

- Node.js 18 ou plus (`node -v`), npm, Git et un éditeur.
- Une clé API, transmise par l'animateur en début de séance. Elle est partagée par toute la salle et révoquée à la fin.

## Installation

```bash
git clone <url-du-repo>
cd workshop-agent-vs-skill
npm install
cp .env.example .env
```

Ouvre `.env` et colle la clé après `ANTHROPIC_API_KEY=`. Ce fichier est ignoré par Git : ne le commite jamais et ne l'affiche pas à l'écran.

Vérifie ensuite que tout fonctionne :

```bash
npm run check
```

Tu dois voir quatre lignes `OK` (Node.js, clé API, SDK client, Agent SDK). Une ligne `KO` indique le correctif à appliquer. Le modèle utilisé se règle dans `.env` avec `WORKSHOP_MODEL`.

## Les trois étapes

| Étape | Dossier | Commande | Ce que tu fais |
| --- | --- | --- | --- |
| 1 | `01-boucle/` | `npm run step1 -- "ta question"` | Écrire deux outils et la boucle de l'agent à la main |
| 2 | `02-agent-sdk/` | `npm run step2 -- "ta question"` | Refaire le même agent avec `query()` |
| 3 | `03-skill/` | `npm run step3 -- "ta question"` | Ajouter un skill à l'agent |

Chaque dossier contient un `ENONCE.md` et un `agent.ts` à compléter. L'agent interroge par défaut le petit projet de `sample-repo/`.

## Comment travailler

Le but n'est pas de finir les trois étapes mais de comprendre ce qui se passe à chacune. Quelques habitudes aident :

- **Lis la section « Comprendre avant de coder » de l'énoncé** avant d'ouvrir `agent.ts`. Elle tient en une minute.
- **Lance le programme après chaque TODO.** Il s'arrête sur le prochain TODO à faire et te dit où chercher.
- **Ouvre les indices un par un.** Chaque TODO en a un ou deux, repliés dans l'énoncé. Le premier oriente, le second est presque du code.
- **Fais les expériences** de fin d'énoncé : elles montrent ce que le code ne dit pas (le coût d'un tour, le rôle d'une description, ce que cache le harness).
- **Bloqué plus de cinq minutes ?** Demande, ou regarde le diff de la solution sur ce seul TODO, puis reviens à ton code.

## Lexique

| Mot | Sens dans cet atelier |
| --- | --- |
| Modèle | Le LLM appelé par l'API (ici Claude). Il produit du texte ou des demandes d'outil, il n'exécute rien. |
| Outil | Une fonction de ton programme, décrite au modèle par un nom, une description et un schéma JSON. |
| Agent | Un modèle, des outils et une boucle qui relance le modèle tant qu'il demande des outils. |
| Harness | Le moteur qui fait tourner un agent : boucle, outils intégrés, permissions, gestion du contexte. Ici, le Claude Agent SDK. |
| Skill | Un fichier `SKILL.md` qui apporte un savoir-faire (règles, méthode, format). L'agent le charge quand la demande s'y prête. |
| `tool_use` / `tool_result` | La demande d'outil du modèle, et la réponse de ton programme, reliées par un identifiant. |
| `stop_reason` | La raison pour laquelle le modèle s'est arrêté : `tool_use` (il attend un outil) ou `end_turn` (il a fini). |

## Passer d'une étape à l'autre

```bash
npm run etape -- 2
```

La commande commite ton travail en cours, puis bascule sur la branche `etape-2`. Elle ne pousse jamais rien et n'a pas besoin d'un nouveau `npm install`.

## Les solutions

Chaque étape a une branche de travail et une branche de solution :

| Branche | Contenu |
| --- | --- |
| `etape-1` | Le socle et le squelette de l'étape 1 |
| `etape-1-solution` | L'étape 1 terminée |
| `etape-2` | Le squelette de l'étape 2 (avec la solution de l'étape 1) |
| `etape-2-solution` | L'étape 2 terminée |
| `etape-3` | Le squelette de l'étape 3 (avec la solution de l'étape 2) |
| `etape-3-solution` | L'étape 3 terminée, avec le skill |
| `main` | Le projet complet |

Pour voir ce qu'il fallait écrire : `git diff etape-1 etape-1-solution`. Pour aller sur la solution : `npm run etape -- 1-solution`.

## Les sujets au choix

Le fil rouge est un agent qui répond à des questions sur un dépôt de code. Tu peux t'en écarter à trois endroits, sans toucher au reste :

- **Étape 1, un autre sujet** : un agent qui interroge `sample-data/ventes.csv` avec deux outils, `list_columns` et `query_rows`. L'énoncé donne les signatures, pas la solution.
- **Étape 1, un outil en plus** : si tu finis tôt, ajoute un troisième outil de ton choix.
- **Étape 3, le skill** : revue de code, résumé d'architecture, guide d'onboarding, ou ta propre idée.

Tu peux aussi apporter ton propre sujet et garder la structure en trois étapes.

## Si ça coince

- `npm run check` te dit quoi corriger. Relance-le après chaque correction.
- Une erreur de limite de débit (429) veut dire que la salle utilise la clé en même temps : attends quelques secondes et relance.
- En visio, passe sur la branche de solution de l'étape et continue à partir de là.

## Pour aller plus loin

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) : quand construire un agent, et quand un simple enchaînement d'appels suffit.
- [Utiliser des outils avec l'API Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Claude Agent SDK : vue d'ensemble](https://code.claude.com/docs/en/agent-sdk/overview)
- [Agent Skills : vue d'ensemble](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
