import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Briefcase, FileText, HelpCircle, Layers } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildSearchIndex, searchItems, type SearchItem } from "@/content/search";

// The search dialog (loaded on first use by SiteSearch). Arrow keys move through the results, Enter
// opens one, Escape closes. The title and description are for screen readers.

const ICONS: Record<SearchItem["kind"], typeof FileText> = {
  Page: FileText, Service: Layers, Work: Briefcase, Post: BookOpen, Question: HelpCircle,
};
const GROUPS: { kind: SearchItem["kind"]; label: string }[] = [
  { kind: "Page", label: "Pages" },
  { kind: "Service", label: "Services" },
  { kind: "Work", label: "Work" },
  { kind: "Post", label: "Journal" },
  { kind: "Question", label: "Questions" },
];

const SearchDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const index = useMemo(() => buildSearchIndex(), []);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = searchItems(index, query);

  const setOpen = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };
  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-xl">
        <DialogTitle className="sr-only">Search the site</DialogTitle>
        <DialogDescription className="sr-only">Type to search the pages, services, work, journal and questions.</DialogDescription>
        <Command shouldFilter={false} label="Search the site" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search pages, services, work, journal…" />
          <p className="sr-only" aria-live="polite" role="status">
            {query.trim() === "" || results.length === 0 ? "" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          </p>
          <CommandList>
            {query.trim() !== "" && <CommandEmpty>No result for “{query.trim()}”.</CommandEmpty>}
            {GROUPS.map(({ kind, label }) => {
              const items = results.filter((r) => r.kind === kind);
              if (items.length === 0) return null;
              const Icon = ICONS[kind];
              return (
                <CommandGroup key={kind} heading={label}>
                  {items.map((r) => (
                    <CommandItem key={`${r.kind}-${r.href}-${r.title}`} value={`${r.kind}-${r.href}-${r.title}`} onSelect={() => go(r.href)} className="gap-3">
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-foreground">{r.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{r.description}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
