.PHONY: install typecheck migrate migrate-down migrate-list generate-schema lint lint-fix format format-check

install:
	pnpm install

typecheck:
	pnpm run typecheck

migrate:
	pnpm run migrate

migrate-down:
	pnpm run migrate:down

migrate-list:
	pnpm run migrate:list

generate-schema:
	pnpm run generate-schema

lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

format:
	pnpm run format

format-check:
	pnpm run format:check
