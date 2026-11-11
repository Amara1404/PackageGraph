# PackageGraph

A recursive software dependency & vulnerability impact tracker.

PackageGraph models a real software ecosystem's dependency graph and exposes
two directions of traversal as recursive database queries: **explosion**
(what installing a package pulls in, transitively) and **implosion** (what
breaks if a package is flagged vulnerable — every package and application
affected, through any number of indirection layers). All data is real and
live: packages come from the npm registry, vulnerabilities come from
osv.dev, with no synthetic or hand-entered records.

| Name | SRN | Section |
|---|---|---|
| Akshata Amara | PES1UG24AM025 | A |
| Annanya Babu | PES1UG24AM045 | A |

## What's been built

### Data model (PostgreSQL)

Nine relational entities, matching the project's ER design exactly:

- `app_user` — role-based accounts (`security_admin` / `developer`)
- `application` — a user's own service, owned by an `app_user`
- `package` — a catalog entry (name + version, unique together)
- `dependency` — self-referencing edge table on `package`, forming the
  directed dependency graph
- `application_dependency` — many-to-many: which packages an application uses
- `vulnerability` — an advisory sourced from OSV.dev (`osv_id`, severity, summary)
- `affected_range` — per-vulnerability affected version ranges, also from OSV.dev
- `vulnerability_flag` — the act of flagging a specific package against a
  specific vulnerability (open/resolved status, who flagged it, when)
- `impact_report` — the computed blast radius for a flag (1:1)

### Advanced database features

- **Recursive CTEs** — `explode_dependencies(package_id)` walks child edges
  to build the full transitive dependency tree; `implode_impact(package_id)`
  walks parent edges in reverse to find every package that transitively
  depends on it. Both guard against cycles via a visited-path array.
- **Transactions** — flagging a vulnerability atomically upserts the
  `vulnerability` + `affected_range` rows, inserts the `vulnerability_flag`,
  and inserts the `impact_report`, all inside one `BEGIN…COMMIT`. Any
  failure rolls back the whole operation.
- **Triggers** —
  - `prevent_dependency_cycle()`: blocks a package from depending on itself,
    directly *or* transitively, before the edge is ever written.
  - `recompute_impact_counts()`: auto-fills `affected_package_count` and
    `affected_app_count` on every insert/update of `impact_report` by
    re-running the recursive implosion query and joining it against
    `application_dependency` — the stored counts can never drift from
    what the graph actually says.
- **Indexing** — on `dependency(parent_package_id)` and
  `dependency(child_package_id)`, the two columns every recursive query
  joins against.

- **Correlated subquery** — the package search endpoint
  (`GET /api/packages`) annotates every result with a `dependent_count`
  computed by a scalar subquery that references the outer `package` row
  (`SELECT COUNT(*) FROM dependency d WHERE d.child_package_id = p.package_id`),
  shown in the UI as "used by N". This sits alongside the recursive CTEs
  above and the nested `IN (SELECT ... UNION ...)` subquery in the impact
  route, so all three query styles (nested, correlated, recursive) are
  represented.

### Document store (MongoDB)

Raw npm registry metadata (README, keywords, maintainers, license) is
stored per package as a document, since this data's shape genuinely varies
across registries/ecosystems and doesn't fit a fixed relational schema.
Full CRUD is exercised against it: `findOne` (read) in the metadata route,
`updateOne` with `upsert: true` (create/update) during a crawl, and
`deleteOne` when a Security Admin deletes a package — the Postgres
`package` row is removed first (cascading dependency/flag rows via FK
constraints), and the Mongo doc is purged only once no other version of
that package name remains.

### Live external data, with fallback caching

- **npm registry** (`registry.npmjs.org`) supplies every package's latest
  version, description, and dependency list. A catalog starts from a
  crawl of seed packages and can also be grown on demand from the UI —
  searching for a package that isn't cached yet offers a "Fetch from npm"
  action that live-crawls just that package.
- **osv.dev** supplies real vulnerability records (id, severity, summary,
  affected version ranges) the moment an admin flags a package against a
  real OSV/GHSA/CVE id — no vulnerability data is hand-entered.
- If either live call fails, the system falls back to the last
  successfully-stored record in Postgres/Mongo instead of hard-failing,
  so a flaky network call never aborts a crawl or a flag.

### Application

- **Next.js** app (App Router) with API routes as the backend, talking
  directly to Postgres (`pg`) and MongoDB (`mongodb` driver).
- **Role-based auth**: bcrypt-hashed passwords, JWT session cookie,
  middleware-enforced route gating — Developers can browse the graph and
  manage their own applications; only Security Admins can flag
  vulnerabilities and see the Vulnerabilities page.
- **Pages**: Packages (search/explode/implode/flag/delete — delete is
  admin-only), Applications (manage your services and which packages they
  use), Vulnerabilities (admin-only — every flag with its computed impact,
  expandable to show the actual affected package and application names,
  not just counts).
- GitHub-inspired UI: left sidebar nav, light/dark theme toggle,
  consistent component kit (cards, badges, buttons).

## Tech stack

Next.js · PostgreSQL · MongoDB · Node.js · bcryptjs · jsonwebtoken ·
Tailwind CSS · live npm registry API · live osv.dev API

## Running it

```
npm install
npm run db:seed-users      # creates admin/dev accounts from .env.local
npm run db:crawl -- express next react-dom --depth 3
npm run dev
```

Apply `db/schema.sql` to a PostgreSQL database and have a MongoDB instance
reachable before running the above; see `.env.local` for the expected
connection variables.

## Testing

Automated end-to-end coverage lives in `e2e/` (Playwright), exercising the
app through the browser against a real Postgres + MongoDB + live
npm/osv.dev — no mocks, matching how the manual checklist in
`TEST_CASES.txt` already describes the app behaving:

- `auth.spec.js` — developer login hides the Vulnerabilities nav/page;
  security_admin login shows it and the Flag-vulnerability panel
- `packages.spec.js` — `debug` explodes to 1 dependency (`ms`) and
  implodes to 6 known packages; an invalid package name returns 400 on
  fetch
- `fetch-npm.spec.js` — searching an uncached package offers "Fetch from
  npm" and caches it (deletes it first if a previous run already cached it)
- `vulnerabilities.spec.js` — flagging a real OSV advisory populates
  `impact_report` counts, and resolving a flag flips its status badge

Run with the dev server reachable at `localhost:3000` (Playwright will
start it automatically if it isn't already running) and the seeded
`admin`/`dev` accounts in place:

```
npm run db:seed-users
npm run test:e2e
```

## Project structure

```
packagegraph/
├── app/
│   ├── api/
│   │   ├── applications/[id]/packages/[packageId]/route.js   # DELETE app↔package link
│   │   ├── applications/[id]/packages/route.js                # GET/POST app's packages
│   │   ├── applications/route.js                               # GET/POST applications
│   │   ├── auth/{login,logout,me}/route.js                    # JWT cookie session auth
│   │   ├── packages/route.js                                   # GET search (+ correlated dependent_count)
│   │   ├── packages/crawl/route.js                             # POST fetch-from-npm (crawl)
│   │   ├── packages/[id]/route.js                               # DELETE package (Postgres + Mongo)
│   │   ├── packages/[id]/{explode,implode,metadata}/route.js  # recursive graph + Mongo metadata
│   │   └── vulnerabilities/
│   │       ├── route.js                                        # GET list, POST flag (txn)
│   │       └── [flagId]/{route.js,impact/route.js}             # PATCH resolve, GET blast radius
│   ├── dashboard/{applications,packages,vulnerabilities}/page.js
│   └── layout.js, page.js (login), globals.css
├── components/            # PackageExplorer, ImpactReports, Applications, Sidebar, Card, Badge, ...
├── lib/
│   ├── auth/{jwt,session}.js   # sign/verify session, cookie read
│   ├── db/{postgres,mongo}.js  # pg Pool + withTransaction, Mongo client/collection
│   ├── crawler.js              # resolvePackage/upsertPackage/upsertMetadata/deleteMetadata/crawl
│   └── osv.js                  # live osv.dev lookup
├── db/schema.sql          # DDL, recursive CTE functions, triggers, indexes
├── e2e/                   # Playwright end-to-end specs (gitignored, see Testing)
├── scripts/{seed-users,crawl}.js
├── public/                # static assets
├── middleware.js          # route-level auth/role gating
├── playwright.config.js
└── TEST_CASES.txt         # manual QA checklist against live data
```

## Future improvement: automatic OSV scanning

Flagging is currently a deliberate human action — a Security Admin decides
a package is worth flagging and enters a real OSV id, and the system
automates everything downstream (lookup, impact computation, report
generation). What it does **not** do yet is automatically discover new
vulnerabilities on its own.

A natural next step is a scheduled job that, for every package already in
the catalog, queries OSV.dev's
[batch query endpoint](https://osv.dev/docs/#tag/api/operation/OSV_QueryAffectedBatch)
(which accepts a package name + ecosystem and returns any known
vulnerability ids) and automatically creates `vulnerability_flag` rows
for anything newly discovered — with a `flagged_by` of `NULL` or a
dedicated "system" account to distinguish auto-flags from human ones.
Admins would then triage system-generated flags (acknowledge, dismiss, or
leave open) rather than needing to already know a CVE/GHSA id exists.
This would close the gap between "the system can tell you the blast
radius of a vulnerability you already know about" and the stronger
promise of "the system tells you when a new vulnerability affecting your
stack appears at all" — turning PackageGraph from a lookup tool into a
genuine early-warning system, much closer to what tools like `npm audit`
or Dependabot do today, but built on the same recursive-graph foundation
already in place here.
