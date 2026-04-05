import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DealRoomsView } from "@/components/deal-rooms/deal-rooms-view";
import type {
  DealRoomWithCompany,
  GtmCompanyProfile,
  GtmProduct,
} from "@/types/database";

export const metadata = {
  title: "Deal Rooms | RevSignal",
  description: "Create and manage secure deal rooms for prospects.",
};

export default async function DealRoomsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [roomsResult, companiesResult, productsResult] = await Promise.all([
    supabase
      .from("deal_rooms")
      .select(
        "*, gtm_company_profiles(company_id, name, slug, logo_url)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("gtm_company_profiles")
      .select("company_id, name, slug, logo_url")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("gtm_products")
      .select("product_id, name, slug, category, tagline, demo_type")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .not("slug", "in", "(surgeengine-platform,audience-dashboard)")
      .order("display_order"),
  ]);

  if (roomsResult.error) {
    console.error("Failed to fetch deal rooms:", roomsResult.error.message);
  }
  if (companiesResult.error) {
    console.error(
      "Failed to fetch companies:",
      companiesResult.error.message
    );
  }
  if (productsResult.error) {
    console.error("Failed to fetch products:", productsResult.error.message);
  }

  const rooms = (roomsResult.data as DealRoomWithCompany[]) ?? [];
  const companies =
    (companiesResult.data as Pick<
      GtmCompanyProfile,
      "company_id" | "name" | "slug" | "logo_url"
    >[]) ?? [];
  const products =
    (productsResult.data as Pick<
      GtmProduct,
      "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type"
    >[]) ?? [];

  return (
    <DealRoomsView
      rooms={rooms}
      companies={companies}
      products={products}
    />
  );
}
