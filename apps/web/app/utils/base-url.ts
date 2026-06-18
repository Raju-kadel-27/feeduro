export function getBaseUrl(): string {
  if (process.env.NGROK_DOMAIN) {
    return `https://${process.env.NGROK_DOMAIN}`;
  }
  return process.env.BASE_URL ?? "http://localhost:3000";
}
