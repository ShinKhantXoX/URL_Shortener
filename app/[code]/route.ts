import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data, error } = await supabase
    .from("urls")
    .select("id, original_url")
    .eq("short_code", code)
    .single();

  if (error || !data) {
    return new NextResponse("Short URL not found", {
      status: 404,
    });
  }

  await supabase.rpc("increment_url_clicks", {
    url_id: data.id,
  });

  return NextResponse.redirect(data.original_url, 302);
}