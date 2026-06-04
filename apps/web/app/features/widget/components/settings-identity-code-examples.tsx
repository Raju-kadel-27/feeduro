import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { CodeBlock } from "./code-block";

type Board = { id: string; name: string; isDefault: boolean; embedToken: string };

type Props = {
  currentToken: string;
  position: "left" | "right";
  theme: "light" | "dark" | "auto";
  orgSlug: string;
  boards: Board[];
  inlineBoardId: string;
  setInlineBoardId: (id: string) => void;
};

export function SettingsIdentityCodeExamples({
  currentToken,
  position,
  theme,
  orgSlug,
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
          code={`import crypto from 'node:crypto';\n\nconst signature = crypto\n  .createHmac('sha256', process.env.FEEDIYO_SIGNING_SECRET)\n  .update(currentUser.id)\n  .digest('hex');\n\n// Pass to the client — e.g. res.render('page', { feediyoSig: signature });`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client
        </p>
        <CodeBlock
          label="page.js"
          code={`window.feediyo.identify({\n  id:        currentUser.id,\n  email:     currentUser.email,\n  name:      currentUser.name,\n  signature: feediyoSig,\n});`}
        />
      </TabsContent>

      <TabsContent value="react" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
          Server — one call, everything included
        </p>
        <CodeBlock
          label="app/root.tsx  ·  layout.tsx  (React Router / Remix)"
          code={`import { createIdentityToken } from '~/lib/identity-token';\n\nexport async function loader({ request }) {\n  const user = await getAuthUser(request);\n\n  const feediyoAuth = user\n    ? await createIdentityToken(\n        user.id,\n        user.email,\n        user.name,\n        process.env.FEEDIYO_SIGNING_SECRET!,\n      )\n    : null;\n\n  return { user, feediyoAuth };\n}`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — pass to the provider, done
        </p>
        <CodeBlock
          label="app/root.tsx  ·  layout.tsx"
          code={`import { FeediyoProvider } from '@feediyo/react';\n\nexport default function Root({ loaderData }) {\n  const { user, feediyoAuth } = loaderData;\n\n  return (\n    <FeediyoProvider\n      token="${currentToken}"\n      position="${position}"\n      theme="${theme}"\n      user={user && feediyoAuth\n        ? { id: user.id, email: user.email, name: user.name, ...feediyoAuth }\n        : null}\n    >\n      {/* your app */}\n    </FeediyoProvider>\n  );\n}`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Automatic login — link to your public board
        </p>
        <CodeBlock
          label="any component inside FeediyoProvider"
          code={`import { useFeediyo } from '@feediyo/react';\n\nfunction FeedbackLink() {\n  const { createAutoLoginUrl } = useFeediyo();\n\n  return (\n    <a href={createAutoLoginUrl('https://${orgSlug}.feediyo.com')}>\n      View public board →\n    </a>\n  );\n}`}
        />
        {boards.length > 1 && (
          <div className="flex items-center gap-2 pl-7">
            <span className="text-xs font-medium text-muted-foreground">Board</span>
            <select
              value={inlineBoardId}
              onChange={(e) => setInlineBoardId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.isDefault ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <CodeBlock
          label="feedback/page.tsx"
          code={`import { FeediyoBoard } from '@feediyo/react';\n\nexport default function FeedbackPage() {\n  return (\n    <FeediyoBoard\n      token="${selectedBoard?.embedToken ?? currentToken}"\n      theme="${theme}"\n      style={{ height: 600 }}\n    />\n  );\n}`}
        />
      </TabsContent>

      <TabsContent value="golang" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="handler.go"
          code={`import (\n    "crypto/hmac"\n    "crypto/sha256"\n    "encoding/hex"\n    "os"\n)\n\nfunc feediyoSignature(userID string) string {\n    mac := hmac.New(sha256.New, []byte(os.Getenv("FEEDIYO_SIGNING_SECRET")))\n    mac.Write([]byte(userID))\n    return hex.EncodeToString(mac.Sum(nil))\n}\n\nsig := feediyoSignature(currentUser.ID)\ntmpl.Execute(w, PageData{User: currentUser, FeediyoSig: sig})`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — Go html/template
        </p>
        <CodeBlock
          label="page.html"
          code={`<script>\n  window.feediyo.identify({\n    id:        '{{ .User.ID }}',\n    email:     '{{ .User.Email }}',\n    name:      '{{ .User.Name }}',\n    signature: '{{ .FeediyoSig }}',\n  });\n</script>`}
        />
      </TabsContent>

      <TabsContent value="rails" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="application_controller.rb"
          code={`require 'openssl'\n\nhelper_method :feediyo_signature\n\ndef feediyo_signature\n  return nil unless current_user\n  OpenSSL::HMAC.hexdigest('SHA256', ENV['FEEDIYO_SIGNING_SECRET'], current_user.id.to_s)\nend`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — ERB
        </p>
        <CodeBlock
          label="layout.html.erb"
          code={`<% if current_user %>\n  <script>\n    window.feediyo.identify({\n      id:        '<%= current_user.id %>',\n      email:     '<%= current_user.email %>',\n      name:      '<%= current_user.name %>',\n      signature: '<%= feediyo_signature %>',\n    });\n  </script>\n<% end %>`}
        />
      </TabsContent>

      <TabsContent value="python" className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">Server</p>
        <CodeBlock
          label="views.py"
          code={`import hmac, hashlib, os\n\ndef feediyo_signature(user_id: str) -> str:\n    secret = os.environ["FEEDIYO_SIGNING_SECRET"].encode()\n    return hmac.new(secret, user_id.encode(), hashlib.sha256).hexdigest()\n\ndef my_view(request):\n    sig = feediyo_signature(str(request.user.id))\n    return render(request, "page.html", {"user": request.user, "feediyo_sig": sig})`}
        />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
          Client — Django / Jinja2
        </p>
        <CodeBlock
          label="layout.html"
          code={`{% if user.is_authenticated %}\n  <script>\n    window.feediyo.identify({\n      id:        '{{ user.id }}',\n      email:     '{{ user.email }}',\n      name:      '{{ user.get_full_name }}',\n      signature: '{{ feediyo_sig }}',\n    });\n  </script>\n{% endif %}`}
        />
      </TabsContent>
    </Tabs>
  );
}
