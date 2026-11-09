# PWA et notifications push

## Installation

Le frontend (`fame-react`) est une Progressive Web App installable :

- `public/manifest.webmanifest` — nom, icônes, `start_url: /#/student`, `display: standalone`.
- `public/sw.js` — service worker : cache du shell, `skipWaiting`, `clients.claim`, et gestion **push** / **notificationclick**.
- `src/main.tsx` — enregistre `/sw.js` au chargement, appelle `registration.update()`, et recharge au `controllerchange` (mise à jour du worker).

L'installation se fait via l'événement natif `beforeinstallprompt` (capturé dans
`src/pwa.ts`). Sur iOS, l'écran affiche les instructions manuelles (« Sur
l'écran d'accueil »).

## Notifications Web Push

Le flux complet :

1. L'étudiant autorise `Notification.requestPermission()`.
2. La clé publique VAPID est lue depuis `/api/v1/config/public`.
3. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
   → l'abonnement existant est **réutilisé** (token FCM stable) ; on ne ré-abonne
   que s'il n'y en a pas.
4. L'abonnement est envoyé à `POST /api/v1/candidate/push-subscriptions`.

Le backend :

1. Programme un `notification_event` (déduplication sur 60 s).
2. Enfile une tâche ARQ après commit.
3. Le worker (`workers/notifications.py`) délivre via `pywebpush` (VAPID).

Le service worker reçoit l'événement `push` et affiche une notification système
(`showNotification`), même application fermée.

## Points de fiabilité

- **TTL non nul** (`PUSH_TTL_SECONDS=300`) : pendant le Doze Android, le message
  est mis en file au lieu d'être abandonné.
- **Abonnement expiré** : un `404`/`410` de FCM marque l'abonnement `INVALID` et
  le supprime.
- **Token stable** : le frontend réutilise `getSubscription()` ; pas de churn de
  token à chaque chargement.
- **`requireInteraction`** pour `ATTRIBUTED`/`IMMEDIATE` (la notification reste
  affichée jusqu'à l'action).
- **`tag`** par type d'événement (une notification remplace la précédente du même
  type).

## Limites

- Le navigateur doit être en cours d'exécution (Chrome en arrière-plan) ; un
  navigateur entièrement quitté ne reçoit pas de push — c'est une limite OS.
- Web Push exige un contexte sécurisé (HTTPS ou `localhost`).
