import { NextResponse } from "next/server";
import faqData from "@/data/faq.json";

export async function GET() {
  return NextResponse.json({ faq: faqData });
}
