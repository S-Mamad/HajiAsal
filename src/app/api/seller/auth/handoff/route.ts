import { consumePanelHandoffRequest } from "@/lib/auth/panel-handoff";

export async function GET(request: Request) {
  return consumePanelHandoffRequest(request, "seller");
}
