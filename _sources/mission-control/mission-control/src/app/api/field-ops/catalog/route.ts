import { NextResponse } from "next/server";
import { getServiceCatalog, getFieldServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const id = searchParams.get("id");
  const excludeSaved = searchParams.get("excludeSaved") === "true";

  const catalog = await getServiceCatalog();
  let services = catalog.services;

  // Get user's saved/active services to mark which catalog items are already saved
  const userServices = await getFieldServices();
  const savedIds = new Set(userServices.services.map((s) => s.catalogId ?? s.id));

  // Filter by ID (single lookup)
  if (id) {
    const found = services.find((s) => s.id === id);
    if (!found) {
      return NextResponse.json({ error: "Catalog service not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: { ...found, isSaved: savedIds.has(found.id) },
    });
  }

  // Filter by category
  if (category) {
    services = services.filter((s) => s.category === category);
  }

  // Full-text search across name, description, tags, capabilities
  if (search) {
    const q = search.toLowerCase();
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }

  // Exclude already-saved services
  if (excludeSaved) {
    services = services.filter((s) => !savedIds.has(s.id));
  }

  // Annotate with isSaved flag
  const annotated = services.map((s) => ({
    ...s,
    isSaved: savedIds.has(s.id),
  }));

  // Build category counts from full catalog (before filtering)
  const categoryCounts: Record<string, number> = {};
  for (const s of catalog.services) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }

  return NextResponse.json({
    data: annotated,
    meta: {
      total: catalog.services.length,
      filtered: annotated.length,
      categories: categoryCounts,
      catalogVersion: catalog.version,
    },
  });
}
