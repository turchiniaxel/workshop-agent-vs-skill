# Étape 2 : le même agent avec l'Agent SDK

Durée : 35 minutes. Fichier à compléter : `02-agent-sdk/agent.ts`.

## Ce que tu vas comprendre

- Un **harness** (ici le Claude Agent SDK, le moteur de Claude Code) fournit la boucle, les outils, les permissions et la gestion du contexte.
- Ton code passe d'une centaine de lignes à un objet d'options : tu configures au lieu de programmer.
- Ce confort a un prix : beaucoup de choses se passent sans que tu les voies. L'option `--verbose` sert à les regarder.
- Le harness reste ouvert : tu peux lui donner tes propres outils, à côté des siens ou à leur place.

## Comprendre avant de coder

Ce que tu as écrit à l'étape 1 a maintenant un équivalent dans le SDK :

| Étape 1, à la main | Étape 2, avec le SDK |
| --- | --- |
| `listFilesTool`, `readFileTool` et leur code | Les outils intégrés `Glob`, `Read`, `Grep`, choisis dans `tools` |
| `safePath` | `cwd`, plus les permissions du SDK |
| `MAX_TURNS` | `maxTurns` |
| `SYSTEM` | Le prompt système de Claude Code, fourni par le SDK |
| `askModel` + `executeToolCalls` + la boucle | `query()`, qui renvoie un flux de messages |
| Un outil à toi (schéma + code) | `tool()` dans un serveur `createSdkMcpServer`, passé dans `mcpServers` |

`query()` ne renvoie pas une réponse mais un **flux** (un `AsyncGenerator`) : tu reçois chaque étape au moment où elle se produit.

```
system/init      la session démarre : modèle, outils, skills
assistant        le modèle demande Glob(...)            ← ton tool_use de l'étape 1
user             le SDK renvoie le tool_result          ← ce que faisait executeToolCalls
assistant        le modèle demande Read(...)
user             tool_result
assistant        le texte de la réponse
result/success   la réponse finale, les tours, le coût
```

## Ce qui est fourni

- La fonction `show` : elle affiche chaque outil appelé, puis la réponse finale, ou une erreur si l'agent s'est arrêté. Avec `--verbose`, elle affiche aussi tous les messages du flux.
- La lecture de la question en argument, comme à l'étape 1.
- `safePath` et `MAX_FILE_CHARS`, repris de l'étape 1, pour le TODO 3.

## Les trois TODO

### TODO 1 : l'objet d'options

Les options sont listées dans le commentaire du fichier. Deux d'entre elles se ressemblent et ne font pas la même chose :

- `tools` décide quels outils **existent** pour le modèle. Ceux qui ne sont pas listés (`Bash`, `Edit`, `Write`…) sont retirés de son contexte.
- `allowedTools` **pré-approuve** des outils : ils s'exécutent sans demande de permission. Seule, cette option ne restreint rien.

Pour choisir les trois outils, parcours la [liste des outils intégrés](https://code.claude.com/docs/en/tools-reference).

<details>
<summary>Indice 1 : quels outils ?</summary>

`list_files` correspond à `Glob` (trouver des fichiers par motif), `read_file` à `Read`. Le troisième, `Grep`, cherche du texte dans les fichiers : c'est le bonus de l'étape 1, offert.
</details>

<details>
<summary>Indice 2 : la forme</summary>

```ts
const options: Options = {
  cwd: SAMPLE_REPO,
  model: MODEL,
  tools: [/* trois noms d'outils, entre guillemets */],
  // ... les quatre autres options du commentaire
};
```
</details>

### TODO 2 : l'appel à `query()`

Importe `query`, passe-lui `{ prompt: question, options }`, et parcours le flux avec `for await` en donnant chaque message à `show`.

<details>
<summary>Indice</summary>

`for await (const message of query({ … })) { … }` : la boucle reçoit les messages un par un, au fil de l'eau. Trois lignes en tout.
</details>

### TODO 3 : ton propre outil, à la place de `Read`

Fais d'abord tourner les TODO 1 et 2 (voir « Tester »). Ensuite, remplace l'outil intégré `Read` par `my_read`, un outil que tu écris toi-même : le même rôle que ton `read_file` de l'étape 1, mais branché dans le harness.

Un outil personnalisé passe par un **serveur MCP intégré** : `tool()` décrit l'outil (nom, description, schéma, code), `createSdkMcpServer` le range dans un serveur qui tourne dans ton process, et l'option `mcpServers` le donne à l'agent. Trois règles :

- Le schéma s'écrit avec `zod` (un objet de champs, pas un JSON Schema). Le SDK le traduit pour le modèle.
- Le modèle voit l'outil sous le nom `mcp__<serveur>__<outil>`, ici `mcp__workshop__my_read`. Tu ne peux pas le nommer `Read` : pour remplacer l'outil intégré, retire `"Read"` de `tools` et ajoute le tien.
- `tools` ne concerne que les outils intégrés : ton outil existe grâce à `mcpServers`. En revanche, il doit figurer dans `allowedTools`, sous son nom complet, sinon le SDK le refuse.

<details>
<summary>Indice 1 : l'outil</summary>

```ts
const myReadTool = tool(
  "my_read",
  "Renvoie le contenu texte d'un fichier du dépôt…",
  { path: z.string().describe("Chemin du fichier…") },
  async ({ path }) => {
    // lis le fichier avec safePath, tronque, puis :
    return { content: [{ type: "text", text: contenu }] };
    // en cas d'erreur : { content: [{ type: "text", text: message }], isError: true }
  },
);
```

Les chemins renvoyés par `Glob` peuvent être absolus : `safePath` les accepte tant qu'ils restent dans `sample-repo/`.
</details>

<details>
<summary>Indice 2 : le brancher</summary>

```ts
const workshopServer = createSdkMcpServer({ name: "workshop", tools: [myReadTool] });

const options: Options = {
  // ...
  tools: ["Glob", "Grep"],
  mcpServers: { workshop: workshopServer },
  allowedTools: ["Glob", "Grep", "mcp__workshop__my_read"],
};
```
</details>

## Tester

```bash
npm run step2 -- "Quels fichiers contient ce projet et que fait sa fonction principale ?"
```

Tu dois voir au moins un outil intégré (`Glob`, `Read` ou `Grep`) puis une réponse.

Demande ensuite une modification : `npm run step2 -- "Ajoute un commentaire dans index.ts"`. Aucun fichier ne doit changer. Vérifie avec `git status` : il doit rester propre.

Après le TODO 3, relance la question de test : les lectures passent maintenant par `mcp__workshop__my_read`, et plus aucun `Read` n'apparaît. Teste aussi le confinement : `npm run step2 -- "Lis ../.env avec my_read" --verbose` doit renvoyer un `tool_result` avec `is_error: true` et ton message « Chemin refusé ».

## Regarder sous le capot

Relance la question de test avec `--verbose` :

```bash
npm run step2 -- "Quels fichiers contient ce projet et que fait sa fonction principale ?" --verbose
```

Repère dans la sortie :

1. Le message `system/init` : quel modèle, quels outils ? Retrouves-tu exactement ta liste `tools` ?
2. Les messages `user` : ce sont les `tool_result` que tu fabriquais à l'étape 1. Le SDK les écrit pour toi. Regarde le format de `Read` : il numérote les lignes, ce que ton `read_file` ne faisait pas.
3. Le message `result` : combien de tours, combien de temps, combien de dollars ? Compare avec le nombre d'appels d'outils affichés.

Il arrive que le modèle tente `Bash` alors que tu ne l'as pas donné : le prompt système de Claude Code lui en parle. Le SDK refuse l'appel, renvoie l'erreur comme `tool_result` avec `is_error: true`, et le modèle se rabat sur `Glob` ou `Read`. C'est le même mécanisme que ton refus de `../.env` à l'étape 1.

## Erreurs fréquentes

| Symptôme | Cause probable |
| --- | --- |
| `L'agent s'est arrêté (error_max_turns)` | `maxTurns` atteint : la question demande trop d'exploration, ou le plafond est trop bas. |
| Un outil est refusé, ou l'agent dit ne pas avoir la permission | L'outil est dans `tools` mais pas dans `allowedTools`. |
| L'agent appelle `Bash` ou `Edit` | `tools` est absent : sans lui, tous les outils de Claude Code sont disponibles. |
| `Erreur : … Claude Code executable not found` | Le binaire embarqué manque : relance `npm install`, puis `npm run check`. |
| Comportement différent de celui du voisin | `settingSources` n'est pas à `[]` : ta config personnelle de `~/.claude/` est chargée. |
| `my_read` est refusé | Il manque dans `allowedTools`, ou il y figure sous le nom court : il faut `mcp__workshop__my_read`. |
| Le modèle n'appelle jamais `my_read` | `"Read"` est encore dans `tools` : le modèle préfère l'outil intégré, que le prompt système de Claude Code lui décrit. |
| `my_read` n'apparaît pas dans le message `init` | `mcpServers` est absent, ou la clé (`workshop`) ne correspond pas au nom utilisé dans `allowedTools`. |

## Expériences

1. **`allowedTools` ne restreint rien.** Retire `tools` et garde `allowedTools`, puis lance `npm run step2 -- "Ajoute un commentaire en haut de src/index.ts" --verbose`. Le message `init` liste maintenant des dizaines d'outils, dont `Bash` et `Edit`, et le modèle appelle `Edit`. Ce qui le bloque, c'est la permission (`system/permission_denied`), pas l'absence de l'outil : deux protections différentes. Remets `tools` ensuite.
2. **Le prompt système caché.** Lance `npm run step2 -- "Réponds OK." --verbose` : plus de 3 000 tokens en entrée pour deux mots. Ton `SYSTEM` de l'étape 1 tenait en une phrase ; la différence, c'est le prompt système et la description des outils de Claude Code. Note aussi la part « relue depuis le cache » : le SDK utilise le prompt caching pour ne pas payer ce préambule plein tarif à chaque tour.
3. **`maxTurns`.** Mets-le à 2 et pose la question de test. Que contient le message `result` ?
4. **`Read` contre `my_read`.** Remets `"Read"` dans `tools` et dans `allowedTools`, en gardant `my_read`, puis pose la question de test. Lequel le modèle choisit-il ? Le prompt système de Claude Code recommande ses outils intégrés : pour qu'un outil à toi soit choisi, il faut retirer le concurrent ou écrire une description qui dit clairement quand le préférer.

## Comparer les deux versions

Mets `01-boucle/agent.ts` et `02-agent-sdk/agent.ts` côte à côte et note :

- Ce qui a disparu de ton code : les schémas d'outils, le code de `list_files`, la boucle, la gestion de `tool_result`.
- Ce qui est revenu avec le TODO 3 : le code de `read_file` et le confinement des chemins. Le harness s'occupe toujours de la boucle et des permissions, toi du métier de l'outil.
- Ce que le harness fait maintenant sans te le montrer : le prompt système, la gestion du contexte quand la conversation grossit (compaction), les relances en cas d'erreur réseau, les permissions.
- Ce que tu as perdu en route : la lisibilité de chaque étape, et le contrôle fin de ce qui part à l'API.

<details>
<summary>Alors, quand écrire sa boucle à la main ?</summary>

Quand tu as besoin d'un contrôle total (format exact des messages, outils très spécifiques, coût minimal, pas de binaire à embarquer). Le SDK est préférable dès que tu veux les outils de Claude Code, les permissions, la gestion du contexte et les skills sans les réécrire.
</details>

## Bonus : un autre sujet

Pour le sujet CSV, pointe `cwd` sur `SAMPLE_DATA`, et `safePath` aussi (sinon `my_read` refuse tout) : `Glob`, `Grep` et `my_read` savent déjà lire `ventes.csv`. Pour aller plus loin, reprends tes outils `list_columns` et `query_rows` de l'étape 1 avec `tool()`, dans le même serveur `workshop`.

## Docs

- [Agent SDK : vue d'ensemble](https://code.claude.com/docs/en/agent-sdk/overview)
- [La boucle d'agent du SDK](https://code.claude.com/docs/en/agent-sdk/agent-loop) : tours, messages du flux, compaction.
- [Référence TypeScript](https://code.claude.com/docs/en/agent-sdk/typescript) : `query()`, `Options`, types de messages.
- [Permissions](https://code.claude.com/docs/en/agent-sdk/permissions) : `allowedTools`, `disallowedTools`, modes de permission.
- [Liste des outils intégrés](https://code.claude.com/docs/en/tools-reference)
- [Outils personnalisés](https://code.claude.com/docs/en/agent-sdk/custom-tools) : `tool()`, `createSdkMcpServer`.
- [Suivi des coûts](https://code.claude.com/docs/en/agent-sdk/cost-tracking)

## Voir la solution

```bash
git diff etape-2 etape-2-solution
```

Pour te placer sur la solution : `npm run etape -- 2-solution`.
