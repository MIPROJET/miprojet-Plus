import { createServerFn } from "@tanstack/react-start";

export type PublicTeamMember = {
  full_name: string;
  role_title: string | null;
  expertise: string | null;
  bio: string | null;
  photo_url: string | null;
  is_external: boolean;
  organization: string | null;
};

export type PublicProject = {
  id: string;
  display_id: string | null;
  title: string;
  short_pitch: string | null;
  description: string | null;
  sector: string | null;
  city: string | null;
  country: string | null;
  creation_date: string | null;
  legal_status: string | null;
  logo_url: string | null;
  cover_url: string | null;
  product_description: string | null;
  target_customers: string | null;
  commercialization: string | null;
  monitoring_evaluation: string | null;
  // v1.1 enrichments
  objectif: string | null;
  maturite: string | null;
  governance: Record<string, unknown> | null;
  // Media + team
  gallery: { url: string; caption: string | null }[];
  video_url: string | null;
  team: PublicTeamMember[];
};

/** Public, anon-callable. Returns ONLY non-sensitive presentation fields. */
export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => {
    if (!data?.slug || typeof data.slug !== "string" || data.slug.length > 64) {
      throw new Error("Invalid slug");
    }
    return { slug: data.slug.trim() };
  })
  .handler(async ({ data }): Promise<PublicProject | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = data.slug;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const query = supabaseAdmin
      .from("mp_projects")
      .select(
        "id, display_id, title, short_pitch, description, sector, city, country, creation_date, legal_status, logo_url, cover_url, product_description, target_customers, commercialization, monitoring_evaluation, objectif, maturite, governance, is_public",
      )
      .eq("is_public", true)
      .limit(1);

    const { data: rows, error } = await (isUuid
      ? query.eq("id", slug)
      : query.eq("display_id", slug.toUpperCase()));
    if (error) throw error;
    const p = rows?.[0] as any;
    if (!p) return null;

    const [{ data: media }, { data: teamRows }] = await Promise.all([
      supabaseAdmin
        .from("mp_project_media")
        .select("kind, storage_path, caption")
        .eq("project_id", p.id)
        .in("kind", ["gallery", "video"]),
      supabaseAdmin
        .from("mp_project_team")
        .select("full_name, role_title, expertise, bio, photo_url, is_external, organization, sort_order")
        .eq("project_id", p.id)
        .order("sort_order", { ascending: true }),
    ]);

    const pub = (path: string) =>
      supabaseAdmin.storage.from("project-media").getPublicUrl(path).data.publicUrl;

    const gallery =
      (media ?? [])
        .filter((m) => m.kind === "gallery")
        .map((m) => ({ url: pub(m.storage_path), caption: m.caption ?? null })) ?? [];
    const videoRow = (media ?? []).find((m) => m.kind === "video");
    const video_url = videoRow ? pub(videoRow.storage_path) : null;

    const team: PublicTeamMember[] = (teamRows ?? []).map((t: any) => ({
      full_name: t.full_name,
      role_title: t.role_title ?? null,
      expertise: t.expertise ?? null,
      bio: t.bio ?? null,
      photo_url: t.photo_url ?? null,
      is_external: !!t.is_external,
      organization: t.organization ?? null,
    }));

    return {
      id: p.id,
      display_id: p.display_id,
      title: p.title,
      short_pitch: p.short_pitch,
      description: p.description,
      sector: p.sector,
      city: p.city,
      country: p.country,
      creation_date: p.creation_date,
      legal_status: p.legal_status,
      logo_url: p.logo_url,
      cover_url: p.cover_url,
      product_description: p.product_description,
      target_customers: p.target_customers,
      commercialization: p.commercialization,
      monitoring_evaluation: p.monitoring_evaluation,
      objectif: p.objectif ?? null,
      maturite: p.maturite ?? null,
      governance: (p.governance ?? null) as Record<string, unknown> | null,
      gallery,
      video_url,
      team,
    };
  });
