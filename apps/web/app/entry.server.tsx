import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

// React Router rejects still-pending deferred loader promises after this long,
// so a hung query fails into the route error boundary instead of holding the
// stream open forever.
export const streamTimeout = 10_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  // Abort React rendering slightly after streamTimeout so the deferred
  // promises reject (and render errorElements) before the stream is torn down.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), streamTimeout + 1_000);
  request.signal.addEventListener("abort", () => controller.abort());

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: controller.signal,
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) {
          console.error(error);
        }
      },
    },
  );
  shellRendered = true;

  body.allReady.then(
    () => clearTimeout(abortTimer),
    () => clearTimeout(abortTimer),
  );

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
