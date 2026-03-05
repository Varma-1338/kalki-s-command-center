import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { login_key } = await req.json();
    if (!login_key || typeof login_key !== "string" || login_key.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Login key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up team by login_key
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, login_key")
      .eq("login_key", login_key.trim())
      .maybeSingle();

    if (teamError || !team) {
      return new Response(JSON.stringify({ error: "Invalid login key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a supabase user exists for this team
    const teamEmail = `team-${team.login_key}@devfest.local`;
    const teamPassword = team.login_key;

    // Try to sign in first
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: teamEmail,
      password: teamPassword,
    });

    if (signInData?.session) {
      return new Response(JSON.stringify({
        session: signInData.session,
        team: { id: team.id, name: team.name },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If user doesn't exist, create one
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: teamEmail,
      password: teamPassword,
      email_confirm: true,
      user_metadata: { full_name: team.name, is_team_account: true },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: "Failed to create team account: " + createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add team member entry linking this user to the team
    if (newUser.user) {
      await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: newUser.user.id,
        member_name: team.name,
        member_email: teamEmail,
      });
    }

    // Now sign in
    const { data: finalSignIn, error: finalError } = await anonClient.auth.signInWithPassword({
      email: teamEmail,
      password: teamPassword,
    });

    if (finalError || !finalSignIn.session) {
      return new Response(JSON.stringify({ error: "Login failed after account creation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      session: finalSignIn.session,
      team: { id: team.id, name: team.name },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
