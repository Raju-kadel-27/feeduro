import { authClient } from "@lib/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function useCreateWorkspace() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
  }

  function reset() {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setError("");
    setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError("");

    const { data, error } = await authClient.organization.create({
      name: name.trim(),
      slug: slug || slugify(name),
    });

    if (error || !data) {
      setError(error?.message ?? "Failed to create workspace");
      setLoading(false);
      return;
    }

    await authClient.organization.setActive({ organizationId: data.id });
    qc.invalidateQueries({ queryKey: ["organizations"] });
    window.location.href = `/${data.slug ?? slug}/dashboard`;
  }

  return {
    name,
    slug,
    error,
    loading,
    canSubmit: !!name.trim() && !loading,
    handleNameChange,
    handleSlugChange,
    submit,
    reset,
  };
}
