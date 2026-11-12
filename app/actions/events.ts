"use server";

import { createClient } from "@/lib/supabase/server";
import type { LinkKind } from "@/types/profile";

export async function recordProfileEvent(
  username: string,
  eventType: "page_view" | "contact_save" | "button_click",
  deviceType: "mobile" | "tablet" | "desktop" | "unknown",
  target: LinkKind | null = null,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_profile_event", {
    p_username: username,
    p_event_type: eventType,
    p_device_type: deviceType,
    p_target: target,
  });
  if (error) throw new Error(`Could not record profile event: ${error.message}`);
}
