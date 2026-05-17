import { PrivacyPage } from "@features/legal/components/privacy-page";

export function meta() {
  return [
    { title: "Privacy Policy — Feediyo" },
    { name: "description", content: "How Feediyo collects, uses, and protects your data." },
  ];
}

export default function Privacy() {
  return <PrivacyPage />;
}
