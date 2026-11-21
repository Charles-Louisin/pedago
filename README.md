# PEDAGO — Administration (Next.js)

Tableau de bord de l'équipe éditoriale : sources officielles, référentiel, usine IA, relecture et validation humaine, publication, coûts, calendrier, utilisateurs.

## Démarrer

```bash
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

L'API `pedago-api` doit tourner sur le port 5000. Comptes de test : voir `pedago-api/.env.example` (`SEED_ADMIN_*`, `SEED_REVIEWER_*`).

## Sécurité

Le navigateur ne voit jamais les jetons : `src/app/api/session` les place dans des cookies httpOnly et `src/app/api/proxy` relaie uniquement les routes `admin/*` et `library/*` vers l'API, avec rafraîchissement automatique. Les comptes enseignants n'ont pas accès au tableau de bord.

## Pages

| Route | Rôle |
| --- | --- |
| `/connexion` | Loader d'entrée + connexion (fond topographique animé) |
| `/` | Vue d'ensemble : orbe d'état de l'usine IA, dépenses, compteurs |
| `/ressources` · `/ressources/[id]` | File de relecture, lecture complète, contrôle IA, sources, décision (approuver, rejeter, publier, réviser) |
| `/referentiel` | Leçons du programme, validation des extractions, priorités |
| `/sources` | Sources officielles (liste blanche), lancement d'extraction |
| `/ia` | Lancer une production, suivre les tâches étape par étape, coût par modèle |
| `/calendrier` · `/utilisateurs` | Administration |
