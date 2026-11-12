import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
if (!password || password.length < 12) throw new Error("Set DEMO_PASSWORD to a password with at least 12 characters.");

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demos = [
  {
    email: "demo-classic@example.com",
    username: "demo-classic",
    full_name: "Salma El Idrissi",
    job_title: "Architecte",
    company: "Atelier Atlas",
    bio: "Architecture durable et espaces qui rapprochent les gens.",
    plan: "free" as const,
    theme_template: "classic" as const,
    theme_color: "#0f766e",
    language: "fr" as const,
    services: [],
    links: [
      { kind: "call" as const, value: "+212600000001" },
      { kind: "email" as const, value: "salma@example.com" },
      { kind: "website" as const, value: "https://example.com" },
      { kind: "linkedin" as const, value: "salma-el-idrissi" },
    ],
  },
  {
    email: "demo-premium@example.com",
    username: "demo-premium",
    full_name: "Youssef Benali",
    job_title: "Créateur de produits",
    company: "Nour Studio",
    bio: "Design, artisanat marocain et objets du quotidien.",
    plan: "premium" as const,
    theme_template: "dark" as const,
    theme_color: "#d7a85a",
    language: "ar" as const,
    services: ["تصميم المنتجات", "استشارات العلامة التجارية"],
    links: [
      { kind: "call" as const, value: "+212600000002" },
      { kind: "whatsapp" as const, value: "+212600000002" },
      { kind: "instagram" as const, value: "@nour.studio" },
      { kind: "location" as const, value: "Marrakech, Morocco" },
    ],
  },
];

async function findOrCreateUser(email: string, username: string, fullName: string) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`Could not list auth users: ${listError.message}`);
  const existing = users.users.find((user) => user.email === email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password, email_confirm: true, user_metadata: { username, full_name: fullName },
    });
    if (error) throw new Error(`Could not update ${email}: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username, full_name: fullName },
  });
  if (error) throw new Error(`Could not create ${email}: ${error.message}`);
  return data.user.id;
}

for (const demo of demos) {
  const userId = await findOrCreateUser(demo.email, demo.username, demo.full_name);
  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: userId,
    username: demo.username,
    full_name: demo.full_name,
    job_title: demo.job_title,
    company: demo.company,
    bio: demo.bio,
    plan: demo.plan,
    theme_template: demo.theme_template,
    theme_color: demo.theme_color,
    language: demo.language,
    services: demo.services,
    is_published: true,
  });
  if (profileError) throw new Error(`Could not seed profile ${demo.username}: ${profileError.message}`);
  const { error: deleteError } = await supabase.from("links").delete().eq("user_id", userId);
  if (deleteError) throw new Error(`Could not replace links for ${demo.username}: ${deleteError.message}`);
  const { error: linksError } = await supabase.from("links").insert(
    demo.links.map((link, sort_order) => ({ ...link, user_id: userId, sort_order })),
  );
  if (linksError) throw new Error(`Could not seed links for ${demo.username}: ${linksError.message}`);
}

console.log("Seeded two published demo profiles. Both accounts use DEMO_PASSWORD.");
