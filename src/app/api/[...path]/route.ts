import { NextRequest, NextResponse } from 'next/server';

const TARGET_API = 'https://vijaysetu.piyushassudani.in/api';

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  const url = new URL(`${TARGET_API}/${pathString}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('host');
  requestHeaders.set('host', 'vijaysetu.piyushassudani.in');

  const options: RequestInit = {
    method: req.method,
    headers: requestHeaders,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.arrayBuffer();
    options.body = body;
  }

  try {
    const upstreamRes = await fetch(url.toString(), options);
    const data = await upstreamRes.arrayBuffer();

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    // Ensure permissive CORS for dev
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new NextResponse(data, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API Proxy error:', error);
    return NextResponse.json(
      { message: 'Live API proxy error', error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
};
