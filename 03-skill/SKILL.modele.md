---
name: nom-du-skill
description: TODO Ce que fait le skill, puis « À utiliser quand… » avec les mots qu'emploierait quelqu'un qui demande ce travail.
---

<!--
Modèle de skill, à copier dans .claude/skills/<nom-du-skill>/SKILL.md, à la racine du repo.

- Le frontmatter (entre les deux lignes ---) doit commencer à la toute première ligne du fichier.
- name : le nom du dossier, en minuscules avec des tirets. Reporte-le dans SKILL_NAME de 03-skill/agent.ts.
- description : lue à CHAQUE session, elle décide si le modèle invoque le skill. Le reste du fichier
  n'est chargé qu'au moment de l'invocation.

Remplace chaque TODO, puis supprime ce commentaire.
Doc : https://code.claude.com/docs/en/agent-sdk/skills
Bonnes pratiques : https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
-->

# TODO Titre du skill

TODO Le rôle en une ou deux phrases. Rappelle que l'agent travaille en lecture seule.

## Méthode

<!-- TODO Comment l'agent doit-il travailler ? Quels outils (Glob, Read, Grep), dans quel ordre ?
     Exemple : « Explore d'abord le projet avec Glob, puis lis chaque fichier avec Read avant d'en parler. » -->

## Règles

<!-- TODO Trois à cinq règles précises et vérifiables. Une règle vague (« le code doit être propre »)
     donne une réponse vague ; une règle précise (« une fonction ne dépasse pas trente lignes ») donne un constat. -->

1. TODO
2. TODO
3. TODO

## Format de sortie imposé

<!-- TODO Le format exact de la réponse : un tableau et ses colonnes, des rubriques fixes, un plan numéroté...
     C'est ce qui rend l'effet du skill visible d'un coup d'œil. Dis aussi quoi faire s'il n'y a rien à signaler. -->
