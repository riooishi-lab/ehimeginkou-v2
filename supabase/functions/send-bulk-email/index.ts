import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentEmail {
  name: string;
  email: string;
  token: string;
}

interface RequestBody {
  students: StudentEmail[];
  subject: string;
  bodyTemplate: string;
  baseUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { students, subject, bodyTemplate, baseUrl }: RequestBody = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const FROM_NAME = Deno.env.get("FROM_NAME") || "採用担当";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "RESEND_API_KEY が設定されていません。Supabase ダッシュボード → Edge Functions → Secrets で設定してください。",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const student of students) {
      const url = `${baseUrl}/watch?token=${student.token}`;
      const body = bodyTemplate
        .replace(/{name}/g, student.name)
        .replace(/{url}/g, url);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [student.email],
          subject,
          text: body,
        }),
      });

      if (res.ok) {
        results.sent++;
      } else {
        results.failed++;
        const errorText = await res.text();
        results.errors.push(`${student.email}: ${errorText}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
