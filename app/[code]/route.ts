import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data, error } = await supabase.rpc("get_url_by_code", {
  p_short_code: code,
});

if (error) {
  console.error("URL lookup error:", error);

  return new NextResponse("Short URL not found", {
    status: 404,
  });
}

if (!data?.length) {
  return new NextResponse("Short URL not found", {
    status: 404,
  });
}

const url = data[0];

await supabase.rpc("increment_url_clicks", {
  url_id: url.id,
});

return NextResponse.redirect(url.original_url, 302);
}