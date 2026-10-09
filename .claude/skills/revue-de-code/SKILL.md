---
name: revue-de-code
description: Fait une revue de code selon les conventions de l'équipe et rend les problèmes dans un tableau. À utiliser quand on demande une revue de code, une relecture, une review ou un audit de qualité d'un projet ou de quelques fichiers.
---

# Revue de code

Tu fais la revue d'un projet TypeScript en lecture seule. Explore-le d'abord avec `Glob`, puis lis chaque fichier source avec `Read` avant d'en parler. Ne signale que ce que tu as vu dans le code, avec son numéro de ligne.

## Les cinq règles de l'équipe

1. **Les erreurs sont traitées à la frontière.** Toute lecture de fichier, tout `JSON.parse`, tout appel réseau est entouré d'un `try/catch`, ou son erreur est volontairement remontée jusqu'à un endroit qui l'affiche. Une exception qui peut faire tomber le programme sans message clair est un problème.
2. **Toute entrée externe est validée.** Une saisie utilisateur, un argument de ligne de commande ou un fichier lu ne passent jamais directement dans la logique : on vérifie leur forme et leurs valeurs avant de s'en servir.
3. **Une fonction reste courte.** Au-delà d'une trentaine de lignes, ou de plus de deux niveaux d'imbrication, elle fait trop de choses et se découpe.
4. **Pas de contournement du typage.** Un `as` qui affirme ce qu'on n'a pas vérifié, un `!` ou un `any` sans justification cachent des erreurs au lieu de les empêcher.
5. **Pas de nombre magique.** Une valeur comme `86400000` porte un nom de constante qui dit ce qu'elle représente.

## Format de sortie imposé

Commence par une phrase qui donne le nombre de problèmes trouvés. Rends ensuite un seul tableau Markdown, trié du plus grave au moins grave, avec exactement ces colonnes :

| Fichier | Ligne | Gravité | Problème | Correction |
| --- | --- | --- | --- | --- |

- **Fichier** : chemin relatif, par exemple `src/catalog.ts`.
- **Ligne** : numéro de la première ligne concernée.
- **Gravité** : `bloquant` (le programme peut planter ou être détourné), `important` ou `mineur`.
- **Problème** : une phrase qui cite la règle enfreinte (« règle 2 »).
- **Correction** : une phrase concrète, avec le code à écrire si cela tient en une ligne.

Termine par une ligne « Verdict : » qui dit si le code peut être fusionné en l'état. Si tu ne trouves aucun problème, dis-le en une phrase au lieu de rendre un tableau vide. N'écris, ne modifie et ne supprime aucun fichier.
