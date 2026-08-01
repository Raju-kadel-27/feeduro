import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { CodeBlock } from "./code-block";

type Board = { id: string; name: string; slug: string; isDefault: boolean };

type Props = {
  theme: "light" | "dark" | "auto";
  orgToken: string;
  boards: Board[];
  inlineBoardId: string;
  setInlineBoardId: (id: string) => void;
};

export function SettingsIdentityCodeExamples({
  theme,
  orgToken,
  boards,
  inlineBoardId,
  setInlineBoardId,
}: Props) {
  const selectedBoard = boards.find((b) => b.id === inlineBoardId) ?? boards[0];

  return (
    <Tabs defaultValue="nodejs">
      <TabsList className="h-9">
        <TabsTrigger value="nodejs">Node.js</TabsTrigger>
        <TabsTrigger value="react">React</TabsTrigger>
        <TabsTrigger value="golang">Go</TabsTrigger>
        <TabsTrigger value="rails">Rails</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
      </TabsList>

      <TabsContent value="nodejs" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="server.js"
          code={`import crypto from 'node:crypto';\n\nconst signature = crypto\n  .createHmac('sha256', process.env.FEEDURO_SIGNING_SECRET)\n  .update(currentUser.id)\n  .digest('hex');\n\n// Pass to the client — e.g. res.render('page', { feeduroSig: signature });`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client
        </p>
        <CodeBlock
          label="page.js"
          code={`window.feeduro.identify({\n  id:        currentUser.id,\n  email:     currentUser.email,\n  name:      currentUser.name,\n  signature: feeduroSig,\n});`}
        />
      </TabsContent>

      <TabsContent value="react" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
          Server — generate the signature
        </p>
        <CodeBlock
          label="app/root.tsx  ·  layout.tsx  (React Router / Remix)"
          code={`import { createIdentityToken } from '~/lib/identity-token';\n\nexport async function loader({ request }) {\n  const user = await getAuthUser(request);\n\n  const feeduroAuth = user\n    ? await createIdentityToken(\n        user.id,\n        user.email,\n        user.name,\n        process.env.FEEDURO_SIGNING_SECRET!,\n      )\n    : null;\n\n  return { user, feeduroAuth };\n}`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — pass the board slug and identity to the SDK
        </p>
        {boards.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Board</span>
            <Select value={inlineBoardId} onValueChange={setInlineBoardId}>
              <SelectTrigger className="h-8 text-sm w-auto min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.isDefault ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CodeBlock
          label="feedback/page.tsx"
          code={`import { FeeduroBoard } from '@feeduro/react';\n\nexport default function FeedbackPage({ loaderData }) {\n  const { user, feeduroAuth } = loaderData;\n\n  return (\n    <div style={{ height: 600 }}>\n      <FeeduroBoard\n        token="${orgToken}"\n        boardSlug="${selectedBoard?.slug ?? "YOUR_BOARD_SLUG"}"\n        theme="${theme}"\n        user={user ? {\n          id: user.id,\n          email: user.email,\n          name: user.name,\n          signature: feeduroAuth?.signature,\n        } : null}\n        style={{ height: '100%' }}\n      />\n    </div>\n  );\n}`}
        />
      </TabsContent>

      <TabsContent value="golang" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="handler.go"
          code={`import (\n    "crypto/hmac"\n    "crypto/sha256"\n    "encoding/hex"\n    "os"\n)\n\nfunc feeduroSignature(userID string) string {\n    mac := hmac.New(sha256.New, []byte(os.Getenv("FEEDURO_SIGNING_SECRET")))\n    mac.Write([]byte(userID))\n    return hex.EncodeToString(mac.Sum(nil))\n}\n\nsig := feeduroSignature(currentUser.ID)\ntmpl.Execute(w, PageData{User: currentUser, FeeduroSig: sig})`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — Go html/template
        </p>
        <CodeBlock
          label="page.html"
          code={`<script>\n  window.feeduro.identify({\n    id:        '{{ .User.ID }}',\n    email:     '{{ .User.Email }}',\n    name:      '{{ .User.Name }}',\n    signature: '{{ .FeeduroSig }}',\n  });\n</script>`}
        />
      </TabsContent>

      <TabsContent value="rails" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="application_controller.rb"
          code={`require 'openssl'\n\nhelper_method :feeduro_signature\n\ndef feeduro_signature\n  return nil unless current_user\n  OpenSSL::HMAC.hexdigest('SHA256', ENV['FEEDURO_SIGNING_SECRET'], current_user.id.to_s)\nend`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — ERB
        </p>
        <CodeBlock
          label="layout.html.erb"
          code={`<% if current_user %>\n  <script>\n    window.feeduro.identify({\n      id:        '<%= current_user.id %>',\n      email:     '<%= current_user.email %>',\n      name:      '<%= current_user.name %>',\n      signature: '<%= feeduro_signature %>',\n    });\n  </script>\n<% end %>`}
        />
      </TabsContent>

      <TabsContent value="python" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="views.py"
          code={`import hmac, hashlib, os\n\ndef feeduro_signature(user_id: str) -> str:\n    secret = os.environ["FEEDURO_SIGNING_SECRET"].encode()\n    return hmac.new(secret, user_id.encode(), hashlib.sha256).hexdigest()\n\ndef my_view(request):\n    sig = feeduro_signature(str(request.user.id))\n    return render(request, "page.html", {"user": request.user, "feeduro_sig": sig})`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — Django / Jinja2
        </p>
        <CodeBlock
          label="layout.html"
          code={`{% if user.is_authenticated %}\n  <script>\n    window.feeduro.identify({\n      id:        '{{ user.id }}',\n      email:     '{{ user.email }}',\n      name:      '{{ user.get_full_name }}',\n      signature: '{{ feeduro_sig }}',\n    });\n  </script>\n{% endif %}`}
        />
      </TabsContent>
    </Tabs>
  );
}
