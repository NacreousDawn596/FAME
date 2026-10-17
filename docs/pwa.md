# PWA — installation & notifications push

## Installation

FAME est une PWA installable (manifest + service worker). Sur mobile :

- **iOS (Safari)** : ouvrir FAME → bouton *Partager* → *Sur l'écran d'accueil*. C'est **obligatoire** pour activer le Web Push sur les versions iOS supportées.
- **Android (Chrome)** : bannière d'installation automatique ou menu → *Installer l'application*.

## Web Push

- Le backend implémente VAPID (Web Push standard) via `nl.martijndwars:web-push`.
- Le service worker (`sw.ts`) gère `push` (affichage immédiat) et `notificationclick` (réouverture de la route autorisée).
- **Payloads minimaux** : jamais de mot de passe, d'identifiant de session, de téléphone ni de données académiques sensibles. Un message tel que « Vous êtes appelé » suffit ; les détails sont affichés dans l'app.
- **Abonnements** : enregistrement, expiration, suppression et association au compte étudiant (`PushSubscription`).

## Limitations & replis

- **iOS** : le Web Push exige l'ajout à l'écran d'accueil et une version iOS supportée. Si la permission est refusée ou indisponible, l'application reste **pleinement fonctionnelle** via les notifications in-app (SSE) et l'écran public.
- **Permission** : demandée uniquement après un geste explicite de l'utilisateur.
- **Repli** : notifications in-app en temps réel + affichage public (écran de salle). Le push n'est jamais le seul moyen de notifier un étudiant.

## Dépannage

- Pas de permission → vérifier le geste utilisateur et l'état `Notification.requestPermission()`.
- Push non reçu sur iOS → vérifier que l'app est installée (mode standalone) et iOS à jour.
- Clé VAPID manquante → `FAME_VAPID_*` non configurées : le push est désactivé proprement (le worker de livraison ignore les envois), l'app reste utilisable.
