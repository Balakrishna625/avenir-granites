import { NextResponse } from "next/server";

export function middleware(req: Request) {
  const user = process.env.BASIC_USER;
  const pass = process.env.BASIC_PASS;
  if (!user || !pass) return NextResponse.next(); // disabled

  const auth = (req as any).headers.get("authorization") || "";
  const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  if (auth !== expected) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Granite"' }
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
