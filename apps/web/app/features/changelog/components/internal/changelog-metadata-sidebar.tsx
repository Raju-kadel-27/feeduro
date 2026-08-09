import { ChangelogAuthorsPanel } from "./changelog-authors-panel";
import { ChangelogRequestsPanel } from "./changelog-requests-panel";
import { ChangelogTagsPanel } from "./changelog-tags-panel";

interface Tag { id: string; name: string }
interface Author { id: string; name: string; email: string; image: string | null }
interface Post { id: string; title: string; status: string }

interface Props {
  changelogId: string;
  appliedTags: Tag[];
  availableTags: Tag[];
  authors: Author[];
  orgMembers: Author[];
  linkedRequests: Post[];
}

export function ChangelogMetadataSidebar({
  changelogId,
  appliedTags,
  availableTags,
  authors,
  orgMembers,
  linkedRequests,
}: Props) {
  return (
    <aside className="w-64 shrink-0 border-l overflow-y-auto">
      <div className="px-4 py-3 border-b">
        <span className="text-xs font-semibold text-muted-foreground">Properties</span>
      </div>
      <div className="divide-y">
        <div className="px-4 py-4">
          <ChangelogTagsPanel
            changelogId={changelogId}
            availableTags={availableTags}
            initialApplied={appliedTags}
          />
        </div>
        <div className="px-4 py-4">
          <ChangelogAuthorsPanel
            changelogId={changelogId}
            initialAuthors={authors}
            orgMembers={orgMembers}
          />
        </div>
        <div className="px-4 py-4">
          <ChangelogRequestsPanel
            changelogId={changelogId}
            initialLinked={linkedRequests}
          />
        </div>
      </div>
    </aside>
  );
}
