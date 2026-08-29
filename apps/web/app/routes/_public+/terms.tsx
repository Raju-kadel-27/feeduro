import { TermsPage } from "@features/public/legal/components/terms-page";

export function meta() {
  return [
    { title: "Terms of Service | Feeduro" },
    { name: "description", content: "Terms governing your use of Feeduro." },
  ];
}

export default function Terms() {
  return <TermsPage />;
}
