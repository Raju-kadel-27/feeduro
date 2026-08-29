import { Link } from "react-router";

export function meta() {
  return [{ title: "Domain Not Configured | Feeduro" }];
}

export default function DomainNotConfigured() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
          <h1 className="text-3xl font-semibold">Domain Not Configured</h1>
          <p className="mt-4 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            The hostname you used is not currently mapped to a Feeduro workspace. If you expected
            this domain to work, please check your custom domain setup or ask the workspace owner to
            finish domain configuration.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90"
            >
              Return home
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
