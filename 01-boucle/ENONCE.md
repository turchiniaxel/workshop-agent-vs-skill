# Étape 1 : la boucle à la main

Durée : 35 minutes. Fichier à compléter : `01-boucle/agent.ts`.

## Ce que tu vas comprendre

- Un modèle n'exécute rien. Il **demande** un outil, et c'est ton programme qui l'exécute puis lui renvoie le résultat.
- Un agent, c'est un modèle, des outils et une boucle qui relance le modèle tant qu'il demande des outils.
- L'API ne garde aucune mémoire : à chaque tour, tu renvoies toute la conversation.

Le but n'est pas de finir. Tu comprendras plus en lisant les indices et en observant ce que fait ton programme qu'en copiant la solution.

## Comprendre avant de coder

Un tour de boucle, c'est un aller-retour avec l'API :

```
 ton programme                                         le modèle
 ─────────────                                         ─────────
 messages = [ user: "Que fait ce projet ?" ]
        ──── messages.create(tools, messages) ────────►
        ◄─── stop_reason: "tool_use"  ─────────────────  « appelle list_files avec dir = "." »
             content: [ tool_use { id, name, input } ]
 exécute list_files(".")       ← c'est TON code qui tourne
 messages += assistant: [tool_use]
 messages += user: [ tool_result { tool_use_id, content } ]
        ──── messages.create(tools, messages) ────────►
        ◄─── stop_reason: "end_turn"  ─────────────────  « Ce projet est un gestionnaire de prêts… »
 affiche la réponse, fin
```

Trois notions reviennent partout :

| Notion | Ce que c'est |
| --- | --- |
| `stop_reason` | Pourquoi le modèle s'est arrêté. `"tool_use"` : il attend un résultat d'outil. `"end_turn"` : il a fini. `"max_tokens"` : sa réponse a été coupée. |
| Bloc `tool_use` | Une demande d'outil dans la réponse du modèle : un `id`, un `name` et un `input` qui respecte le schéma. |
| Bloc `tool_result` | Ta réponse à cette demande, envoyée dans un message `user`. Son `tool_use_id` reprend l'`id` du `tool_use`. |

## Ce qui est fourni

- `safePath` : confine tout chemin à `sample-repo/`. Le modèle choisit les chemins, donc on ne lui fait pas confiance.
- `listFilesTool` et `listFiles` : le premier outil, complet. Sers-t'en de modèle.
- `runTool` : appelle le bon outil et transforme une exception en résultat d'erreur (`is_error: true`).
- `printAnswer` : affiche le texte de la réponse finale.
- `checkProgress` et `TodoError` : l'échafaudage qui t'indique le prochain TODO. Ne t'en occupe pas.

Lance le programme après chaque TODO : le message t'indique le suivant.

```bash
npm run step1 -- "Que fait ce projet ?"
```

## Les cinq TODO

### TODO 1 : le schéma de `read_file`

Complète `readFileTool` : une `description`, un paramètre `path` dans `properties`, et `"path"` dans `required`.

La description est la seule documentation que lit le modèle : elle lui dit ce que fait l'outil et quand s'en servir. Une description vague donne un agent qui hésite ou qui se trompe d'outil.

<details>
<summary>Indice 1</summary>

Copie la structure de `listFilesTool` et remplace `dir` par `path`. Ajuste les deux descriptions : celle de l'outil et celle du paramètre.
</details>

<details>
<summary>Indice 2</summary>

`properties` est un objet dont chaque clé est un paramètre : `{ path: { type: "string", description: "…" } }`. `required` est un tableau de noms : `["path"]`.
</details>

### TODO 2 : le code de `read_file`

Écris `readFile(path)` : lis le fichier avec `readFileSync`, en passant le chemin par `safePath`, et tronque le texte au-delà de `MAX_FILE_CHARS` caractères.

Pourquoi tronquer ? Le contenu du fichier entre dans l'historique, et l'historique repart en entier à chaque tour. Un fichier de 100 Ko se paie à chaque appel suivant.

<details>
<summary>Indice 1</summary>

`readFileSync(safePath(path), "utf8")` renvoie une chaîne. Pas besoin de `try/catch` : `runTool` s'en charge.
</details>

<details>
<summary>Indice 2</summary>

`text.slice(0, MAX_FILE_CHARS)` garde le début. Un ternaire suffit : si `text.length` dépasse la limite, renvoie le début suivi de `"\n[... fichier tronqué]"`, sinon `text`.
</details>

### TODO 3 : l'appel au modèle

Écris `askModel(messages)` : un appel à `client.messages.create` avec `model`, `max_tokens`, `system`, `tools` et `messages`.

Une fois ce TODO fait, `main()` fait un premier essai d'un seul tour et affiche la réponse brute. Lis-la : tu dois y voir `stop_reason : tool_use` et un bloc `{ type: 'tool_use', id: 'toolu_…', name: 'list_files', input: { dir: '.' } }`. Le modèle n'a rien exécuté, il demande.

La réponse peut aussi contenir un bloc `thinking`, le raisonnement du modèle, masqué à l'affichage. Il fait partie de la réponse : quand tu l'ajouteras à l'historique, garde `response.content` en entier, sans filtrer.

<details>
<summary>Indice</summary>

`return client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, … });` La méthode renvoie déjà une `Promise<Message>`.
</details>

### TODO 4 : exécuter les appels d'outils

Écris `executeToolCalls(content)` : pour chaque bloc `tool_use` de la réponse, affiche l'appel, exécute `runTool` et fabrique un `tool_result`. Renvoie la liste.

Le modèle peut demander plusieurs outils dans un même tour (par exemple lire trois fichiers d'un coup). Chacun doit recevoir son `tool_result`, sinon l'API refuse le message suivant.

<details>
<summary>Indice 1</summary>

Une boucle `for (const block of content)` avec `if (block.type !== "tool_use") continue;`. Après ce test, TypeScript sait que `block` a un `id`, un `name` et un `input`.
</details>

<details>
<summary>Indice 2</summary>

Le bloc à fabriquer : `{ type: "tool_result", tool_use_id: block.id, content, is_error }`, où `content` et `is_error` viennent de `runTool(block.name, block.input)`.
</details>

### TODO 5 : la boucle

Remplace le premier essai de `main()` par la boucle. Le pseudo-code est dans le commentaire au-dessus de `main()`.

Deux points à ne pas rater :

- La réponse du modèle entre dans l'historique **avant** les résultats d'outils (rôle `assistant`), sinon les `tool_result` répondent à une question que l'API ne voit pas.
- Tous les `tool_result` d'un tour partent dans **un seul** message `user`.

<details>
<summary>Indice 1</summary>

`for (let turn = 1; turn <= MAX_TURNS; turn++) { … }`. À l'intérieur : `askModel`, puis `messages.push({ role: "assistant", content: response.content })`.
</details>

<details>
<summary>Indice 2</summary>

Si `response.stop_reason !== "tool_use"`, appelle `printAnswer(response.content)` puis `return`. Sinon, `messages.push({ role: "user", content: executeToolCalls(response.content) })` et le tour suivant commence.
</details>

## Tester

```bash
npm run step1 -- "Quels fichiers contient ce projet et que fait sa fonction principale ?"
```

Tu dois voir, au fil de l'eau, au moins un appel `list_files` et un appel `read_file`, puis une réponse en français qui cite `src/index.ts`.

Teste aussi le confinement : `npm run step1 -- "Lis le fichier ../.env"`. L'outil doit refuser, et le modèle te l'expliquer. Il a reçu le refus comme un résultat d'outil avec `is_error: true`.

## Erreurs fréquentes

| Symptôme | Cause probable |
| --- | --- |
| `400 … tool_use ids were found without tool_result blocks` | Un `tool_use` n'a pas reçu son `tool_result`, ou les résultats sont partis dans plusieurs messages. |
| `400 … unexpected tool_use_id found in tool_result blocks` | Le message `assistant` n'a pas été ajouté à l'historique avant les résultats. |
| L'agent relit les mêmes fichiers à chaque tour | L'historique est recréé à chaque tour au lieu d'être complété : `messages` doit être déclaré avant la boucle. |
| Le modèle n'utilise jamais `read_file` | L'outil n'est pas dans `tools`, ou sa description ne dit pas quand s'en servir. |
| `Plafond de 10 tours atteint` | Le modèle tourne en rond : regarde les appels affichés, souvent une erreur d'outil répétée. |
| `429` | La salle partage la clé : attends quelques secondes et relance. |

## Expériences, une fois que ça marche

Chaque expérience prend une minute et montre une chose qu'on ne voit pas en lisant le code.

1. **Le coût de l'historique.** Dans la boucle, affiche `response.usage.input_tokens` à chaque tour. Le nombre grossit : chaque tour renvoie tout ce qui précède.
2. **La description compte.** Remplace la description de `read_file` par `"Outil."` et relance. Le modèle s'en sert-il encore, et aussi bien ?
3. **Le plafond.** Mets `MAX_TURNS` à 1. Que se passe-t-il, et pourquoi ce garde-fou est-il indispensable ?
4. **L'historique complet.** À la fin de `main()`, fais `console.dir(messages, { depth: null })` : c'est exactement ce que voit le modèle au dernier tour.

## Pour vérifier ta compréhension

<details>
<summary>Qui exécute <code>readFileSync</code> : le modèle ou ton programme ?</summary>

Ton programme. Le modèle produit seulement un bloc `tool_use` qui décrit l'appel souhaité. C'est pour ça que `safePath` est dans ton code : c'est toi qui décides ce qui s'exécute.
</details>

<details>
<summary>Pourquoi renvoyer toute la conversation à chaque appel ?</summary>

L'API Messages est sans état : elle ne garde rien d'un appel à l'autre. La « mémoire » de l'agent, c'est ton tableau `messages`. C'est aussi pour ça que le coût grossit à chaque tour.
</details>

<details>
<summary>Que se passerait-il sans <code>safePath</code> ?</summary>

Le modèle pourrait lire n'importe quel fichier lisible par ton programme, `.env` compris, par exemple si un fichier du dépôt contenait une instruction piège. Un outil doit valider ses arguments comme une API publique.
</details>

## Variante : interroger un fichier CSV

Au lieu du dépôt de code, ton agent interroge `sample-data/ventes.csv` (colonnes : `date`, `region`, `produit`, `quantite`, `montant`). Tu gardes la boucle et remplaces les deux outils :

- `list_columns()` : renvoie la liste des colonnes du fichier.
- `query_rows(column, value)` : renvoie les lignes dont la colonne `column` vaut `value`, 20 au maximum.

Pas de solution fournie. `SAMPLE_DATA` est exporté par `shared/config.ts`. Pense à adapter `SYSTEM` et `runTool`. Question de test : « Combien de claviers a-t-on vendus dans la région Nord ? »

<details>
<summary>Indice</summary>

`readFileSync(resolve(SAMPLE_DATA, "ventes.csv"), "utf8").trim().split("\n")` donne les lignes ; la première contient les colonnes. Pour `list_columns`, `input_schema` est `{ type: "object", properties: {} }`.
</details>

## Bonus : un troisième outil

Tu as fini en avance ? Ajoute l'outil de ton choix, par exemple `search_text(query)` qui cherche une chaîne dans tous les fichiers, ou `count_lines(path)`. Il faut un schéma, du code, une entrée dans `tools` et une branche dans `runTool`. Reste en lecture seule : aucun outil n'écrit, ne supprime ni n'exécute de commande.

## Docs

- [Définir des outils](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) : `name`, `description`, `input_schema`, et comment écrire une bonne description.
- [Traiter les appels d'outils](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) : `tool_use`, `tool_result`, `is_error`, appels parallèles.
- [Les raisons d'arrêt](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) : `stop_reason` et ses valeurs.
- [Référence de l'API Messages](https://platform.claude.com/docs/en/api/messages)
- [SDK TypeScript `@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript)
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) : l'article d'Anthropic sur la boucle d'agent et quand s'en servir.

## Voir la solution

```bash
git diff etape-1 etape-1-solution
```

Pour te placer sur la solution : `npm run etape -- 1-solution`.
