import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { CategoryGridTrack } from "@/components/sections/CategoryGridTrack";
import { resolvePageCopy } from "@/lib/page-copy";
import { getSiteSettings } from "@/lib/server/site-settings";
import { getHomeCategoriesAsync } from "@/lib/server/categories";

export async function CategoryGrid() {
  const categories = await getHomeCategoriesAsync();
  const copy = resolvePageCopy(await getSiteSettings());

  if (categories.length === 0) return null;

  return (
    <section className="py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="mb-6 md:mb-10">
          <SectionHeading
            title={copy.home.categoriesTitle}
            subtitle={copy.home.categoriesSubtitle}
            className="max-w-lg"
          />
        </Reveal>
        <CategoryGridTrack categories={categories} />
      </div>
    </section>
  );
}
