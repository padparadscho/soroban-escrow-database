> [!IMPORTANT]  
> This project is in active development and may not have been fully tested. Use at your own risk.

> [!WARNING]
> This project and involved contributors are not affiliated with, endorsed by, or sponsored by Stronghold or any of its affiliates. This is an independent personal project developed for educational and experimental purposes only.

<div align="center">

[![Dependabot Updates](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/dependabot/dependabot-updates)
[![Checks](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/checks.yml/badge.svg)](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/checks.yml)
[![Pipeline Validate](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/pipeline-validate.yml/badge.svg)](https://github.com/padparadscho/soroban-escrow-database/actions/workflows/pipeline-validate.yml)

</div>

# Soroban Escrow Database

Shared database for the [soroban-escrow-notifier](https://github.com/padparadscho/soroban-escrow-notifier) and [soroban-escrow-dashboard](https://github.com/padparadscho/soroban-escrow-dashboard) projects, providing a single source of truth for migrations on the Neon PostgreSQL instance.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) package manager
- PostgreSQL database instance
- [Goldsky](https://goldsky.com/) account and CLI tool with Turbo extension
- (Optional) [Validation Cloud Node API](https://www.validationcloud.io/node) key
- Access to a [Soroban RPC](https://developers.stellar.org/docs/data/apis/rpc/providers) endpoint

### Installation

1. Clone the repository:

```bash
git clone https://github.com/padparadscho/soroban-escrow-database.git

cd soroban-escrow-database
```

2. Install dependencies:

```bash
pnpm install
```

3. Create and configure the `.env` file with your environment variables:

```bash
cp .env.example .env
```

- `DATABASE_URL`: PostgreSQL instance, [Neon](https://neon.com/) recommended.
- (Optional) `VALIDATIONCLOUD_API_KEY`: Validation Cloud Node API key as a quick solution to retrieve historical prices. It offers up to **1 year of history**.

4. Deploy pipeline:

```bash
# Create a secret
# NEON_DB_SECRET is the name set in pipeline files, if renaming the secret, ensure to also modify corresponding files
goldsky secret create

# Validate
goldsky turbo validate pipelines/pipeline-mainnet.yaml

# Deploy
goldsky turbo apply pipelines/pipeline-mainnet.yaml
```

**Note**: Only new events and transactions will be processed after deployment. Historical data will not be backfilled, for this, use `pipelines/pipeline-backfill`.

5. Run migrations:

```bash
# Run all pending migrations up
pnpm migrate

# Show migration status
pnpm migrate:list
```

6. Prepare the database schema (for reference):

```bash
# Generate TypeScript types for database tables
pnpm generate-schema
```

7. (Optional) Scripts

```bash
# Populate the database with historical prices for processed events
pnpm ts-node ./scripts/fetch-historical-prices.ts

# Seed the events table with actual data from the events JSON file
pnpm ts-node ./scripts/seed-events-table.ts
```

The `scripts/tables` folder will be updated periodically as new events and transfers are processed.

### Makefile

Optional Makefile shortcuts:

```bash
make install            # Install dependencies
make dev                # Run in development mode
make build              # Build in production mode
make start              # Build and start in production mode
make typecheck          # Run type checker
make generate-schema    # Generate TypeScript types for database tables
make lint               # Run linter
make lint-fix           # Run linter with auto-fix
make format             # Format code
make format-check       # Check formatting
```

## Contributing

If you're interested in helping improve this project, see [CONTRIBUTING](/CONTRIBUTING.md).

## License

This project is licensed under the [GPL-3.0 License](/LICENSE).
