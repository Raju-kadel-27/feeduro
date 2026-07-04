import { neonConfig } from "@neondatabase/serverless";

// Local development: the neon driver expects Neon's cloud endpoints, so both
// transports are pointed at the docker-compose proxies in front of the local
// Postgres (see docker/docker-compose.yml):
//   HTTP → local-neon-http-proxy on :4444   (used by getDb)
//   WS   → wsproxy on :5433                  (used by withTransaction)
// DATABASE_URL keeps host "localhost"; only the ports differ per transport.
export function configureDevDriver(): void {
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}
