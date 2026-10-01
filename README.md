# Slack Threads Web App

A Next.js application for browsing and searching saved Slack discussions. It reads an existing MongoDB archive, displays thread replies and checks archived content hashes through a BSV overlay lookup service. Wallet integrations provide signed voting and Paymail tipping.

## Features

- Paginated thread browsing and search across the opening message of each thread.
- Thread detail pages with replies, Slack-style formatting, mentions and emoji.
- Integrity indicators based on the archive's content hash and the `ls_slackthread` lookup service.
- Wallet-signed votes and tipping controls for users with a Paymail address.
- Slack image proxying and custom emoji lookup.
- Application health and database readiness endpoints.

## Requirements

- Node.js 22 and npm.
- MongoDB containing the saved thread data.
- Access to the archive's BSV overlay service and its shared hashing secret for integrity checks.
- A Slack bot token with access to the relevant workspace resources for private images and custom emoji.
- A compatible BSV wallet for voting and tipping.

The application reads an archive prepared by another service. A Slack export importer, archiving bot and overlay server are not included here.

## Run locally

```sh
git clone https://github.com/bsv-blockchain-demos/slack-threads-webapp.git
cd slack-threads-webapp
npm ci
```

Create a `.env.local` file. For a basic local database connection and frontend origin:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/slackApp
NEXT_PUBLIC_HOST=http://localhost:3000
```

Configure the remaining integrations as needed:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. The connection code explicitly selects the `slackApp` database. |
| `NEXT_PUBLIC_HOST` | Application origin used by the browser to call `/api/verify`. Set this before building the frontend. |
| `RANDOM_SECRET` | The same hashing secret used by the service that archived the threads. A different value produces different integrity hashes. |
| `SLACK_BOT_TOKEN` | Server-side token for Slack image and emoji requests. |
| `VERIFY_CACHE_TTL_MS` | Verification cache duration in milliseconds; defaults to `300000`. |
| `VERIFY_CONCURRENCY` | Concurrent thread verification limit; defaults to `5`. |

Database connection timeouts and pool sizes can also be configured through the `MONGODB_*` variables in [src/lib/db.js](src/lib/db.js).

Start the development server:

```sh
npm run dev -- --hostname 127.0.0.1
```

Open `http://localhost:3000`. An empty database produces an empty archive; populating it requires a compatible external archiving process.

## Archive data

The application uses these collections in `slackApp`:

| Collection | Contents |
| --- | --- |
| `threads` | Thread metadata and ordered messages. The first message is used for listing and search. |
| `users` | Slack user information, usernames and optional Paymail addresses. |
| `votes` | Vote records keyed by message timestamp. |
| `tips` | Tip records written after payment creation. |

Thread documents use a string `_id` and include `channel`, `saved_by`, `last_updated` and `messages`. Message entries supply `text`, `ts`, `user` and a `userInfo` object. Keep the archive's data shape consistent with the readers in [app/page.js](app/page.js) and [the thread detail page](app/threads/[threadId]/page.js).

For integrity checks, the API hashes a selected representation of the thread plus `RANDOM_SECRET`, then asks `ls_slackthread` for a matching record. The current check treats a non-empty lookup response as success; it does not independently validate the returned transaction proof.

## Build and run

```sh
npm run build
npm start
```

The project uses Next.js standalone output and includes a [Dockerfile](Dockerfile) and [container publishing workflow](.github/workflows/docker-publish.yml).

The checked-in [Compose configuration](docker-compose.yml) supplies `HOST`, but the browser code reads `NEXT_PUBLIC_HOST`. Configure the latter for the frontend build before relying on the container setup. The current Dockerfile does not define a build argument for this value.

The `lint` script still calls `next lint`, which is unavailable in the installed Next.js 16 version. That script needs updating. No automated test script is included.

## Wallet and service notes

The wallet helper currently uses the origin `localhost:3000`. Voting signs data in the browser, while the tip API also attempts to connect to a wallet from the Node.js server. A remote deployment needs a deliberate wallet connection setup for both environments.

`GET /health` reports application liveness. `GET /ready` checks the MongoDB connection and returns HTTP 503 when the database is unavailable.

## Source guide

- [src/lib/threadController.js](src/lib/threadController.js): archive queries and search.
- [src/components/ThreadList.js](src/components/ThreadList.js): listings and integrity status.
- [app/threads/](app/threads/): thread detail views and interaction controls.
- [app/api/verify/route.js](app/api/verify/route.js): content hashing and overlay lookup.
- [app/api/vote/route.js](app/api/vote/route.js): signed vote handling.
- [app/api/tip/route.js](app/api/tip/route.js): Paymail payment creation and tip records.
- [src/components/walletServiceHooks.js](src/components/walletServiceHooks.js): wallet connection and vote signing.

## Licence

No licence file is currently included in this repository.
