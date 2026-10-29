import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CORE_STACK, STACK_CATEGORIES, isCoreTool } from "@/content/techStack";

const pad = (n: number) => String(n).padStart(2, "0");

/** Core stack first, then the twelve categories as a keyboard-navigable tab panel (no carousel, no logo wall). */
const TechStack = () => (
  <div>
    {/* Level 1: core stack */}
    <div className="mb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <h3 className="text-xl font-display font-semibold">Core stack</h3>
        <p className="text-sm text-muted-foreground">Used on most projects.</p>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-lg overflow-hidden border border-border/60 bg-border/60">
        {CORE_STACK.map((tool, i) => (
          <li
            key={tool.name}
            className="bg-card p-5 sm:p-6 flex flex-col gap-3 motion-safe:transition-colors motion-safe:duration-300 hover:bg-secondary"
          >
            <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">{pad(i + 1)}</span>
            <span>
              <span className="block text-lg font-display font-semibold text-foreground">{tool.name}</span>
              <span className="block text-sm text-muted-foreground">{tool.role}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>

    {/* Level 2 and 3: categories, with core and per-project tools told apart */}
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
      <h3 className="text-xl font-display font-semibold">Engineering ecosystem</h3>
      <p className="text-sm text-muted-foreground">Twelve areas. Choose one to see its tools and capabilities.</p>
    </div>

    <Tabs defaultValue={STACK_CATEGORIES[0].slug} orientation="vertical" className="grid lg:grid-cols-[18rem_1fr] gap-6 lg:gap-10">
      <TabsList
        aria-label="Technology categories"
        className="h-auto grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col lg:items-stretch gap-1 bg-transparent p-0"
      >
        {STACK_CATEGORIES.map((c, i) => (
          <TabsTrigger
            key={c.slug}
            value={c.slug}
            className="justify-start gap-3 whitespace-normal text-left rounded-md border border-transparent px-3 py-2.5 text-muted-foreground hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <span className="font-mono text-xs text-muted-foreground shrink-0" aria-hidden="true">{pad(i + 1)}</span>
            <span>{c.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {STACK_CATEGORIES.map((c, i) => {
        const core = c.tools.filter(isCoreTool);
        const perProject = c.tools.filter((t) => !isCoreTool(t));
        return (
          <TabsContent key={c.slug} value={c.slug} className="mt-0 self-start rounded-lg border border-border/60 bg-card/50 p-6 sm:p-8">
            <p className="font-mono text-xs text-muted-foreground mb-2" aria-hidden="true">{pad(i + 1)} / {pad(STACK_CATEGORIES.length)}</p>
            <h4 className="text-2xl font-display font-semibold text-foreground mb-2">{c.name}</h4>
            <p className="text-muted-foreground mb-8 max-w-2xl">{c.description}</p>

            {core.length > 0 && (
              <ToolGroup label="Core stack" items={core} emphasis />
            )}
            {perProject.length > 0 && (
              <ToolGroup label="Chosen per project" items={perProject} />
            )}
            {c.capabilities.length > 0 && (
              <div>
                <h5 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Capabilities</h5>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-0 sm:gap-y-0 md:gap-y-0 lg:gap-y-0">
                  {c.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-3 py-2 border-t border-border/40 text-sm text-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>

    <p className="text-sm text-muted-foreground mt-6 max-w-3xl">
      Tools marked "chosen per project" are selected to fit each brief; no single project uses all of them.
    </p>
  </div>
);

const ToolGroup = ({ label, items, emphasis = false }: { label: string; items: readonly string[]; emphasis?: boolean }) => (
  <div className="mb-8">
    <h5 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{label}</h5>
    <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
      {items.map((t) => (
        <li
          key={t}
          className={`rounded-md border px-3 py-2.5 text-sm font-medium motion-safe:transition-colors motion-safe:duration-200 ${
            emphasis
              ? "border-accent/40 bg-secondary text-foreground hover:border-accent/70"
              : "border-border/60 text-foreground hover:border-accent/40"
          }`}
        >
          {t}
        </li>
      ))}
    </ul>
  </div>
);

export default TechStack;
