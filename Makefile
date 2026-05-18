.DEFAULT_GOAL := dev

dev:
	$(MAKE) -C apps/web dev

dev-local:
	$(MAKE) -C apps/web dev-local

fresh:
	$(MAKE) -C apps/web fresh

.PHONY: dev dev-local fresh
