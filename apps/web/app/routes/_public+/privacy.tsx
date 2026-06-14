import { PrivacyPage } from "@features/public/legal/components/privacy-page";

export function meta() {
  return [
    { title: "Privacy Policy — Feeduro" },
    { name: "description", content: "How Feeduro collects, uses, and protects your data." },
  ];
}

export default function Privacy() {
  return <PrivacyPage />;
}
