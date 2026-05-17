import { TermsPage } from "@features/legal/components/terms-page";

export function meta() {
  return [
    { title: "Terms of Service — Feediyo" },
    { name: "description", content: "Terms governing your use of Feediyo." },
  ];
}

export default function Terms() {
  return <TermsPage />;
}
