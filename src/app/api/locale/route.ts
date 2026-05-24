import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_MAX_AGE, normalizeLocale } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const locale = normalizeLocale(typeof body?.locale === "string" ? body.locale : null);
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_MAX_AGE,
  });
  return NextResponse.json({ locale });
}
