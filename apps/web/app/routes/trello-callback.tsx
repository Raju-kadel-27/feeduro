import { useEffect } from "react";

// Trello's implicit grant flow appends the token as a hash fragment (#token=...).
// Hash fragments are never sent to the server, so this client-side page extracts
// the token and forwards it to the server handler as a regular query param.
export function meta() {
  return [{ title: "Connecting Trello… | Feeduro" }];
}

export default function TrelloCallback() {
  useEffect(() => {
    const orgId = new URLSearchParams(window.location.search).get("orgId");
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");

    window.location.replace(
      orgId && token
        ? `/api/oauth2/integrations/trello?orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(token)}`
        : "/",
    );
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Connecting to Trello…</p>
    </div>
  );
}
