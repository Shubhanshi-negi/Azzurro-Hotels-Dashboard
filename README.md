# Azzurro Guest Intelligence

A management-facing review operations dashboard for the four Azzurro Hotels properties in Sydney. Official identities, locations, accommodation descriptions, and property imagery link to the [Azzurro Hotels website](https://www.azzurrohotels.com/).

## Data integrity

The repository includes 16 clearly identified synthetic review examples for local demonstration. They are not Booking.com records. No ratings, review counts, quotations, review text, or guest feedback are represented as actual Azzurro or Booking.com data. The dashboard identifies synthetic data in the UI and marks each sample review. It does not scrape Booking.com; an authorized source integration or approved CSV export is required before importing actual guest feedback.

## Features

- Responsive Next.js dashboard with the cinematic property introduction, property detail pages, dynamic rating/category averages, monthly trends, sentiment analytics, and clickable portfolio comparison.
- Express API with MongoDB/Mongoose persistence, paginated reviews, validated create/edit/delete workflows, response-status tracking, search, filters, and CSV import/export.
- LLM-backed review sentiment/topic analysis. Analysis is only run on request, and the per-review results are persisted. Topic mention counts are aggregated from the persisted classification topics. There is no canned AI-response fallback.
- Review-grounded AI Operations Assistant. It answers from a bounded set of stored review records and validates cited IDs and exact quote evidence.
- Demo-memory mode supports read-only dashboard/review browsing and CSV export. Review writes and AI endpoints return an explicit `503` until their required integrations are available.

## Run locally

Requirements: Node.js 22+ and npm. MongoDB is optional for browsing the synthetic demonstration.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Express API listens on port `4000`, with `/api/*` proxied by Next.js.

Copy `.env.example` to `.env.local` to connect MongoDB and either Gemini or an OpenAI-compatible provider:

```dotenv
MONGODB_URI=mongodb://localhost:27017/azzurro-insights
OPENAI_API_KEY=replace-with-authorized-provider-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
WEB_ORIGIN=http://localhost:3000
```

MongoDB is required for review writes, CSV import, sentiment/topic analysis, and the Operations Assistant. Configure `GEMINI_API_KEY` (with optional `GEMINI_MODEL`) to use Google's OpenAI-compatible Gemini endpoint, or configure `OPENAI_API_KEY` (with optional `OPENAI_MODEL` and `OPENAI_BASE_URL`) for OpenAI or another compatible provider. If both keys are present, Gemini is selected. Keep credentials server-side and out of `NEXT_PUBLIC_*` variables.

If MongoDB is configured but its connection fails, the API still starts in read-only synthetic demo mode and shows a database status message in the dashboard. For Atlas authentication errors, verify the **database user** credentials (not the Atlas website login), ensure the user is allowed to access the target database, and percent-encode reserved characters in the URI password. Also check the Atlas IP access list and cluster status.

On first MongoDB startup, the API upserts the four official property records and seeds synthetic examples only if the review collection is empty. It does not seed synthetic examples into a non-empty collection. Synthetic records are not automatically deleted when real reviews are imported. For mixed datasets, the UI labels that synthetic records are included; synthetic placeholder sentiment is excluded from mixed-dataset sentiment analytics unless reviews have been analysed by the configured LLM.

## Review CSV format

CSV import is limited to 5,000 reviews per upload (2 MB request limit). The required headers are:

```csv
propertyId,date,score
```

Optional headers are `guestName`, `country`, `stay`, `title`, `positive`, `negative`, `replyStatus`, `sourceRef`, and `category_cleanliness`, `category_comfort`, `category_staff`, `category_facilities`, `category_location`, `category_value`. The `propertyId` must match one of `potts-point`, `central-sydney`, `darling-harbour`, or `olympic-hotel-paddington`. Dates use `YYYY-MM-DD`; scores and category scores are from 0 to 10. `sourceRef` values must be unique within a property. Imports are validated as a whole before writing and remain unanalysed until an AI analysis is run.

CSV export respects the active property, sentiment, response-status, date, and search filters. It exports up to 10,000 rows per request.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | API health, storage mode, and configured integration status |
| `GET /api/dashboard` | Dynamically calculated portfolio analytics, property aggregates, trend, and integration status |
| `GET /api/properties` | Official property records with current review and category aggregates |
| `GET /api/reviews?page=&limit=&propertyId=&sentiment=&replyStatus=&from=&to=&search=` | Paginated review search and filters |
| `POST /api/reviews` | Create an unanalysed manual review (MongoDB required) |
| `PATCH /api/reviews/:id` | Edit review content/score or update response status (MongoDB required) |
| `DELETE /api/reviews/:id` | Delete a review (MongoDB required) |
| `POST /api/reviews/import` | Validate and import CSV using `Content-Type: text/csv` (MongoDB required) |
| `GET /api/reviews/export?...filters` | Export reviews matching active filters as CSV |
| `POST /api/insights` | Run and persist LLM sentiment/topic analysis for up to the 120 most recent reviews overall or for a selected property (MongoDB and AI key required) |
| `POST /api/assistant` | Ask a review-grounded management question using up to the 80 most recent reviews overall or for a selected property (MongoDB and AI key required) |

## Validate

```powershell
npm test
npm run typecheck
npm run build
npm audit
```

The tests cover dynamic analytics, filtering, CSV validation/import/export, escaping, and demo-property identity. Live MongoDB and LLM integration tests require credentials/services that are not included in the repository.

## Deployment

Docker Compose starts Next.js, Express, and MongoDB:

```powershell
docker compose up --build
```

Set `GEMINI_API_KEY` or `OPENAI_API_KEY` in the Compose environment to enable AI. The MongoDB data is stored in the `mongo-data` volume. The API seeds the demo reviews only when the review collection is empty.

For separate web/API hosts:

- **API:** configure `API_PORT`, `MONGODB_URI`, `WEB_ORIGIN`, and either Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`) or OpenAI-compatible settings (`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`).
- **Web:** set `API_INTERNAL_URL` at build time to a server-reachable API URL ending in `/api`; keep `NEXT_PUBLIC_API_URL=/api` when using a same-origin proxy.
- Do not publicly expose MongoDB. Use HTTPS and place the management application behind the organization’s authentication/SSO gateway before public or business use. This repository does not implement end-user login, roles, or tenant isolation; CORS and rate limits are not substitutes for authentication.
- No Booking.com ingestion credentials or authorization are configured. Only import review data from sources Azzurro is authorized to use.

## Project layout

```text
app/                 Next.js route, dashboard UI, and styles
lib/types.ts         Shared API and UI types
server/              Express API, Mongoose models, analysis, sample data, tests
Dockerfile           Container image
docker-compose.yml   Web, API, and MongoDB services
```
