import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Build the target URL with all query parameters
  const apiHost = process.env.YV_API_HOST || 'api-staging.youversion.com';
  const targetURL = new URL(`https://${apiHost}/auth/callback`);
  targetURL.search = searchParams.toString();

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Make the request server-side (bypasses CORS)
    const response = await fetch(targetURL.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Accept any 3xx redirect status
    const validRedirects = [301, 302, 303, 307, 308];
    if (!validRedirects.includes(response.status)) {
      return NextResponse.json(
        { error: `Expected 3xx redirect, got ${response.status}` },
        { status: 500 },
      );
    }

    const rawLocation = response.headers.get('Location')?.trim();
    if (!rawLocation) {
      return NextResponse.json(
        { error: 'No Location header in redirect response' },
        { status: 500 },
      );
    }

    // Resolve relative Location to absolute URL
    const absoluteLocation = new URL(rawLocation, targetURL).toString();

    // Return the Location header to the client (no-cache)
    return NextResponse.json(
      { location: absoluteLocation },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Auth Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
