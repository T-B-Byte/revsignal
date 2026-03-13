"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Folder Actions ---

export async function createSidebarFolder(
  name: string
): Promise<{ folder_id: string } | { error: string }> {
  const parsed = z.string().min(1).max(50).safeParse(name);
  if (!parsed.success) return { error: "Folder name is required (max 50 chars)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get next sort order
  const { data: existing } = await supabase
    .from("sidebar_folders")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order as number) ?? -1) + 1;

  const { data, error } = await supabase
    .from("sidebar_folders")
    .insert({
      user_id: user.id,
      name: parsed.data,
      sort_order: nextOrder,
    })
    .select("folder_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  return { folder_id: data.folder_id };
}

export async function renameSidebarFolder(
  folderId: string,
  name: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(folderId)) return { error: "Invalid folder ID" };
  const parsed = z.string().min(1).max(50).safeParse(name);
  if (!parsed.success) return { error: "Folder name is required (max 50 chars)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("sidebar_folders")
    .update({ name: parsed.data })
    .eq("folder_id", folderId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function deleteSidebarFolder(
  folderId: string
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(folderId)) return { error: "Invalid folder ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Deleting the folder cascades to sidebar_item_assignments,
  // so items return to root level automatically
  const { error } = await supabase
    .from("sidebar_folders")
    .delete()
    .eq("folder_id", folderId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function toggleFolderOpen(
  folderId: string,
  isOpen: boolean
): Promise<{ success: boolean } | { error: string }> {
  if (!UUID_REGEX.test(folderId)) return { error: "Invalid folder ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("sidebar_folders")
    .update({ is_open: isOpen })
    .eq("folder_id", folderId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

// --- Item Assignment Actions ---

export async function moveItemToFolder(
  navKey: string,
  folderId: string | null
): Promise<{ success: boolean } | { error: string }> {
  const keyParsed = z.string().min(1).max(50).safeParse(navKey);
  if (!keyParsed.success) return { error: "Invalid nav key" };
  if (folderId && !UUID_REGEX.test(folderId)) return { error: "Invalid folder ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (folderId === null) {
    // Remove from any folder (move to root)
    const { error } = await supabase
      .from("sidebar_item_assignments")
      .delete()
      .eq("user_id", user.id)
      .eq("nav_key", keyParsed.data);
    if (error) return { error: "Failed to move item. Please try again." };
  } else {
    // Upsert assignment
    const { error } = await supabase
      .from("sidebar_item_assignments")
      .upsert(
        {
          user_id: user.id,
          nav_key: keyParsed.data,
          folder_id: folderId,
          sort_order: 0,
        },
        { onConflict: "user_id,nav_key" }
      );
    if (error) return { error: "Failed to move item. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function reorderFolders(
  folderIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Update sort_order for each folder
  for (let i = 0; i < folderIds.length; i++) {
    if (!UUID_REGEX.test(folderIds[i])) continue;
    await supabase
      .from("sidebar_folders")
      .update({ sort_order: i })
      .eq("folder_id", folderIds[i])
      .eq("user_id", user.id);
  }

  revalidatePath("/");
  return { success: true };
}

// --- Bulk fetch for sidebar ---

export async function getSidebarOrganization(): Promise<{
  folders: Array<{
    folder_id: string;
    name: string;
    sort_order: number;
    is_open: boolean;
  }>;
  assignments: Array<{
    nav_key: string;
    folder_id: string;
    sort_order: number;
  }>;
} | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [foldersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("sidebar_folders")
      .select("folder_id, name, sort_order, is_open")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("sidebar_item_assignments")
      .select("nav_key, folder_id, sort_order")
      .eq("user_id", user.id),
  ]);

  return {
    folders: foldersResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
  };
}
