import { NextRequest, NextResponse } from 'next/server';

const LOCAL_API = 'http://127.0.0.1:5002/api';
const REMOTE_API = 'https://vijaysetu.piyushassudani.in/api';

export const maxDuration = 300;

async function resolveTargetApi(): Promise<{ base: string; host?: string }> {
  if (process.env.BACKEND_API_URL) {
    const raw = process.env.BACKEND_API_URL.replace(/\/+$/, '').replace(/\/api\/:path\*$/, '').replace(/\/api$/, '');
    const base = `${raw}/api`;
    try {
      const host = new URL(base).host;
      return { base, host };
    } catch {
      return { base };
    }
  }

  if (process.env.USE_LOCAL_BACKEND === 'true') {
    try {
      const ping = await fetch('http://127.0.0.1:5002/', { method: 'HEAD', signal: AbortSignal.timeout(1000) });
      if (ping.ok || ping.status === 200 || ping.status === 404) {
        return { base: LOCAL_API, host: '127.0.0.1:5002' };
      }
    } catch {
      // fallback to remote
    }
  }

  return { base: REMOTE_API, host: 'vijaysetu.piyushassudani.in' };
}

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  const target = await resolveTargetApi();
  const url = new URL(`${target.base}/${pathString}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('host');
  if (target.host) {
    requestHeaders.set('host', target.host);
  }

  const options: RequestInit = {
    method: req.method,
    headers: requestHeaders,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.arrayBuffer();
    options.body = body;
    requestHeaders.set('content-length', body.byteLength.toString());
  }

  let upstreamRes: Response | null = null;
  let lastError: unknown = null;

  // Up to 2 retries for transient dev restarts
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstreamRes = await fetch(url.toString(), options);
      break;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  if (!upstreamRes) {
    console.error('API Proxy error:', lastError);
    return NextResponse.json(
      { message: 'API connection failed', error: lastError instanceof Error ? lastError.message : String(lastError) },
      { status: 502 }
    );
  }

  try {
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
    console.error('API Proxy response parsing error:', error);
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
