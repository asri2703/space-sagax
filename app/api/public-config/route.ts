import { getPublicConfig } from "@/lib/saga";

export async function GET() {
  return Response.json(await getPublicConfig());
}
