'use strict';

const http = require('node:http');
const https = require('node:https');
const url = require('node:url');

const PORT = process.env.PORT || 8080;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// The GitHub Pages URL to redirect back to after OAuth
const PAGES_ORIGIN = process.env.PAGES_ORIGIN || 'https://adevcorn.github.io/basalt-registry';
const CALLBACK_PATH = '/auth/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: CLIENT_ID and CLIENT_SECRET environment variables must be set.');
  process.exit(1);
}

function httpsGet(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPost(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  // CORS headers — only Pages origin allowed
  res.setHeader('Access-Control-Allow-Origin', PAGES_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /auth/login — redirect user to GitHub OAuth
  if (path === '/auth/login' && req.method === 'GET') {
    const ghUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&scope=public_repo` +
      `&redirect_uri=${encodeURIComponent(`https://basalt-registry-auth.fly.dev${CALLBACK_PATH}`)}`;
    res.writeHead(302, { Location: ghUrl });
    res.end();
    return;
  }

  // GET /auth/callback — exchange code for token, redirect to Pages
  if (path === CALLBACK_PATH && req.method === 'GET') {
    const code = parsed.query.code;
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing code parameter');
      return;
    }

    const postData = JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code });
    let result;
    try {
      result = await httpsPost({
        hostname: 'github.com',
        path: '/login/oauth/access_token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'basalt-registry-auth/1.0',
        },
      }, postData);
    } catch (err) {
      console.error('Token exchange error:', err);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Token exchange failed');
      return;
    }

    let parsed_body;
    try {
      parsed_body = JSON.parse(result.body);
    } catch {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Invalid response from GitHub');
      return;
    }

    if (parsed_body.error) {
      console.error('GitHub OAuth error:', parsed_body.error_description);
      const errorRedirect = `${PAGES_ORIGIN}/submit.html#error=${encodeURIComponent(parsed_body.error_description || parsed_body.error)}`;
      res.writeHead(302, { Location: errorRedirect });
      res.end();
      return;
    }

    const token = parsed_body.access_token;
    const redirect = `${PAGES_ORIGIN}/submit.html#token=${encodeURIComponent(token)}`;
    res.writeHead(302, { Location: redirect });
    res.end();
    return;
  }

  // Health check
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`basalt-registry-auth listening on port ${PORT}`);
});
