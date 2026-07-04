.DEFAULT_GOAL := dev

dev: docker_up
	@if command -v gnome-terminal >/dev/null 2>&1; then \
		gnome-terminal -- bash -c "pnpm db:studio; exec bash" & \
	elif command -v xterm >/dev/null 2>&1; then \
		xterm -e "pnpm db:studio; bash" & \
	else \
		echo "No supported terminal found; run 'pnpm db:studio' manually"; \
	fi
	pnpm dev:tunnel

dev-local: docker_up
	@if command -v gnome-terminal >/dev/null 2>&1; then \
		gnome-terminal -- bash -c "pnpm db:studio; exec bash" & \
	elif command -v xterm >/dev/null 2>&1; then \
		xterm -e "pnpm db:studio; bash" & \
	else \
		echo "No supported terminal found; run 'pnpm db:studio' manually"; \
	fi
	BASE_URL=https://localhost:3000 pnpm dev

fresh: docker_up
	@echo "Nuking database..."
	@pnpm db:nuke
	@echo "Clearing migration files..."
	@rm -rf db/migrations
	@mkdir -p db/migrations/meta
	@printf '{"version":"7","dialect":"postgresql","entries":[]}' > db/migrations/meta/_journal.json
	@echo "Running migrations..."
	@pnpm db:migrate
	@echo "Seeding database..."
	@pnpm db:seed
	@echo "Seeding post dates..."
	@node scripts/seed-post-dates.mjs
	@echo "Seeding vote dates..."
	@node scripts/seed-vote-dates.mjs
	@echo "Done. Run 'make dev' to start the server."

docker_up:
	@echo "Starting Docker services (db, neon-proxy, neon-http-proxy, smtp)..."
	docker compose -f ../../docker/docker-compose.yml --env-file .dev.vars up db neon-proxy neon-http-proxy smtp -d --wait
	@echo "Postgres is healthy; neon-proxy (WS) on :5433, neon-http-proxy (HTTP) on :4444."

.PHONY: dev dev-local fresh docker_up
