# ZoomVerse

Gioco idle di crafting e farming di pianeti (Mini App Telegram). Il frontend è React + Vite + Three.js; l’API è Express e il database è PostgreSQL.

Questa copia parte dal repository pubblico [Zoom0100/ZoomVerse](https://github.com/Zoom0100/ZoomVerse). La cartella `attached_assets` (upload di Replit: foto, video e note) non è inclusa: il gioco non la importa.

## Avviare il frontend

Il server di sviluppo inoltra `/api` all’API già online su Render (`https://zoomverse-api.onrender.com`).

```bash
corepack enable
pnpm install
PORT=8642 pnpm --filter @workspace/zoom-master run dev
```

Apri `http://localhost:8642`.

In sviluppo il client usa l’identità browser già prevista nel codice e parla con l’API di produzione. Le azioni (craft, mercato, shop) modificano i dati reali di quell’account.

## Token del bot

Nel file pubblico `.replit` c’era il token del bot Telegram. In questa copia il valore è stato svuotato. Revocalo da BotFather e generane uno nuovo: chiunque poteva leggerlo su GitHub.
