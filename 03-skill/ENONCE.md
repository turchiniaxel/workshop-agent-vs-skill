# Étape 3 : ajouter un skill à l'agent

Durée : 20 minutes. Fichiers à écrire : `03-skill/agent.ts` (trois options) et `.claude/skills/<nom>/SKILL.md`.

## Ce que tu vas comprendre

- Un **skill** est un fichier Markdown qui apporte un savoir-faire à un agent : des conventions, une méthode, un format de réponse.
- Le comportement de l'agent change **sans toucher à son code**. Le skill porte le savoir-faire, l'agent porte l'exécution.
- Un skill se charge en deux temps, et c'est ce qui permet d'en avoir beaucoup sans saturer le contexte.

## Comprendre avant de coder

**Agent ou skill ?** L'agent, c'est la boucle, les outils et les permissions : ce que tu as construit aux étapes 1 et 2. Le skill ne sait rien exécuter tout seul : il dit à l'agent *comment* faire un travail précis. Un même agent peut porter plusieurs skills, et un même skill peut servir à plusieurs agents.

**Le chargement en deux temps :**

```
 au démarrage                     le SDK lit le frontmatter de chaque SKILL.md
                                  → seuls name et description entrent dans le contexte du modèle

 « Fais une revue de code »       le modèle compare la demande aux descriptions
                                  → il appelle l'outil Skill({ skill: "revue-de-code" })

 après l'appel                    le SDK injecte le corps du SKILL.md dans la conversation
                                  → le modèle suit tes règles et ton format
```

C'est pour ça que la **description** est la partie la plus importante : si elle ne correspond pas à la demande, le reste du fichier n'est jamais lu.

## Ce qui est fourni

- La fonction `show` : elle affiche les skills découverts au démarrage, dit si ton skill est utilisable et sinon pourquoi, repère chaque appel à l'outil `Skill` (ligne `★`) et affiche la réponse.
- La constante `SKILL_NAME` : le nom de ton skill. Change-la si tu en choisis un autre.
- `03-skill/SKILL.modele.md` : un modèle de `SKILL.md` commenté, à copier.

Au départ, l'agent annonce « Skill pas encore utilisable » avec la raison : le diagnostic te guide d'un TODO à l'autre.

## Les deux TODO

### TODO 1 : les trois options

Par rapport à l'étape 2 (le point de départ reprend le `Read` intégré : ton `my_read` du TODO 3 n'est plus là, pour que l'étape reste centrée sur le skill) :

- `tools` : ajoute `"Skill"`. C'est l'outil que le modèle appelle pour invoquer un skill. Sans lui, le modèle connaît la description mais ne peut pas charger le skill.
- `settingSources` : `["project"]` au lieu de `[]`. Le SDK lit alors le dossier `.claude/` du repo (il le cherche dans `cwd` et dans ses dossiers parents). Ton `~/.claude/` reste hors jeu.
- `skills` : `[SKILL_NAME]`. Claude Code embarque ses propres skills, dont un `code-review` : nommer le tien évite que le modèle préfère celui-là.

<details>
<summary>Indice</summary>

Trois lignes à modifier ou ajouter dans `options`, rien d'autre. `allowedTools` ne bouge pas : l'option `skills` suffit à autoriser l'invocation.
</details>

### TODO 2 : le fichier `SKILL.md`

Crée le dossier `.claude/skills/<nom>/` **à la racine du repo** (pas dans `sample-repo/`, pas dans `03-skill/`), copie-y le modèle sous le nom `SKILL.md`, puis remplis-le.

```bash
mkdir -p .claude/skills/revue-de-code
cp 03-skill/SKILL.modele.md .claude/skills/revue-de-code/SKILL.md
```

Ce qui fait un bon skill :

- **Une description qui dit quand l'utiliser**, avec les mots de la demande : « revue de code », « relecture », « review ». Écris-la à la troisième personne : elle décrit le skill au modèle.
- **Des règles précises et vérifiables.** « Le code doit être propre » ne donne rien ; « une fonction ne dépasse pas trente lignes » donne un constat avec un numéro de ligne.
- **Un format de sortie imposé** (un tableau, des rubriques fixes). Il rend l'effet du skill visible d'un coup d'œil.
- **Court.** Le corps entre dans le contexte à chaque invocation : vise moins d'une page.

<details>
<summary>Indice : une description qui se déclenche bien</summary>

Deux phrases suffisent : ce que fait le skill, puis « À utiliser quand on demande une revue de code, une relecture, une review ou un audit de qualité. »
</details>

<details>
<summary>Indice : des règles pour la revue de code</summary>

Pense à ce que tu refuserais dans une vraie revue : une exception non gérée autour d'un `JSON.parse`, une saisie utilisateur utilisée sans validation, une fonction trop longue, un `as` ou un `!` qui contourne le typage, un nombre magique. `sample-repo/` contient trois de ces défauts, plantés exprès.
</details>

## Trois idées de skill

- **Revue de code** : cinq règles de ton équipe et un tableau fichier / ligne / gravité / problème / correction. C'est la version de la démo.
- **Résumé d'architecture** : un plan imposé (rôle du projet, modules, flux de données, points fragiles).
- **Guide d'onboarding** : ce qu'un nouvel arrivant doit lire en premier, dans quel ordre, et quels pièges éviter.

Tu peux aussi partir d'une idée à toi. Pense alors à adapter la question par défaut et `SKILL_NAME` dans `agent.ts`.

## Déclencher le skill

Deux façons, à essayer toutes les deux :

1. **Par sa description** : `npm run step3 -- "Fais une revue de code de ce projet"`. Le modèle décide d'invoquer le skill ; tu vois une ligne `★ Skill invoqué`.
2. **Par son nom** : `npm run step3 -- "/revue-de-code"`. Ici, pas de ligne `★` : c'est le SDK qui injecte le skill avant même que le modèle réponde, sans lui laisser le choix. Tu le reconnais au format de la réponse.

Puis regarde le skill entrer dans la conversation :

```bash
npm run step3 -- "Fais une revue de code de ce projet" --verbose
```

Juste après la ligne `★ Skill invoqué`, deux messages `user` arrivent : le `tool_result` « Launching skill », puis le texte de ton `SKILL.md`. C'est le deuxième temps du chargement : ton fichier entre dans la conversation à ce moment-là, pas avant.

## Vérifier

- Au démarrage, la ligne « Skill activé pour le modèle » s'affiche.
- La demande qui correspond à la description déclenche un appel à `Skill`, et la réponse suit le format que tu as imposé.
- Compare avec l'étape 2 : `npm run step2 -- "Fais une revue de code de ce projet"` donne une réponse libre, sans le format. C'est la différence apportée par le skill, sans une ligne de code en plus.

## Erreurs fréquentes

Le diagnostic affiché au démarrage couvre la plupart des cas. Sinon :

| Symptôme | Cause probable |
| --- | --- |
| Le skill n'apparaît pas dans « Skills découverts » | Fichier mal nommé (`skill.md`, `SKILL.MD`), mauvais dossier, ou frontmatter qui ne commence pas à la ligne 1. |
| Le skill est découvert mais jamais invoqué | La description ne correspond pas à la demande, ou `"Skill"` manque dans `tools`. |
| Le modèle invoque `code-review` au lieu du tien | `skills` est absent ou vaut `"all"`. |
| Le format n'est pas respecté | Les instructions de format sont noyées dans le texte : mets-les dans une section à part, avec un exemple. |

## Expériences

1. **La description décide.** Remplace-la par « Un skill utile. » et relance la demande. Le modèle invoque-t-il encore le skill ? Remets-la ensuite.
2. **Le skill contre le code.** Change une règle ou le format dans `SKILL.md` et relance : le comportement change sans toucher à `agent.ts`.
3. **Le choix entre deux skills.** Écris un deuxième skill (par exemple un résumé d'architecture), passe `skills: "all"` et pose deux questions différentes. Le modèle choisit-il le bon skill à chaque fois ?

## Pour vérifier ta compréhension

<details>
<summary>Pourquoi ne pas tout mettre dans le prompt système ?</summary>

Tout ce qui est dans le prompt système occupe le contexte à chaque tour, même quand c'est inutile. Un skill ne coûte que sa description tant qu'il n'est pas invoqué : on peut en installer des dizaines. Et il se partage comme un fichier, sans modifier le code de l'agent.
</details>

<details>
<summary>Le skill peut-il donner de nouveaux outils à l'agent ?</summary>

Non. Le skill donne des instructions ; l'agent n'a que les outils de `tools`. Un skill qui dirait « lance les tests avec Bash » échouerait ici, car `Bash` n'est pas disponible. Le skill porte le savoir-faire, l'agent porte l'exécution.
</details>

## Docs

- [Agent SDK : skills](https://code.claude.com/docs/en/agent-sdk/skills) : `settingSources`, `skills`, l'outil `Skill`.
- [Skills dans Claude Code](https://code.claude.com/docs/en/skills) : format du `SKILL.md`, frontmatter, fichiers annexes.
- [Agent Skills : vue d'ensemble](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) : le chargement progressif.
- [Agent Skills : bonnes pratiques](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) : écrire une description et des instructions efficaces.
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) : l'article d'Anthropic sur la conception des skills.

## Voir la solution

```bash
git diff etape-3 etape-3-solution
```

Pour te placer sur la solution : `npm run etape -- 3-solution`.
