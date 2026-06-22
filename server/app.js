const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback_default_secret_for_dev_only';
const CLIENT_ID = process.env.POE_CLIENT_ID || 'Poe2BuildPlannerEditor';
const CLIENT_SECRET = process.env.POE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.POE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const CONTACT_EMAIL = process.env.POE_CONTACT_EMAIL || 'admin@poe2builder.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || '/';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true, // Allow dev origin
  credentials: true
}));

// Serves the static client files when running in production
const distPath = path.join(__dirname, '..', 'src', 'renderer', 'dist');
app.use(express.static(distPath));

// --- Cryptography & Encryption Helpers ---
function getSecretKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  const key = getSecretKey(SESSION_SECRET);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  try {
    const key = getSecretKey(SESSION_SECRET);
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// --- PKCE Helpers ---
function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// Custom User-Agent header required by GGG
const GGG_HEADERS = {
  'User-Agent': `OAuth ${CLIENT_ID}/1.0.0 (contact: ${CONTACT_EMAIL})`
};

// Helper: refresh token exchange with GGG
async function performTokenRefresh(refreshToken) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  if (CLIENT_SECRET) {
    params.append('client_secret', CLIENT_SECRET);
  }

  const response = await fetch('https://www.pathofexile.com/oauth/token', {
    method: 'POST',
    headers: {
      ...GGG_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return data;
}

// Helper: Get active token from cookie, automatically refreshing if expired
async function getOrRefreshSession(req, res) {
  const sessionCookie = req.cookies.poe_session;
  if (!sessionCookie) return null;

  const decrypted = decrypt(sessionCookie);
  if (!decrypted) return null;

  let session;
  try {
    session = JSON.parse(decrypted);
  } catch (e) {
    return null;
  }

  const now = Date.now();
  // Refresh if less than 5 minutes of lifetime remains
  if (session.expires_at - now < 5 * 60 * 1000) {
    console.log('Token is near expiry or expired, refreshing...');
    try {
      const tokenData = await performTokenRefresh(session.refresh_token);
      
      session.access_token = tokenData.access_token;
      session.refresh_token = tokenData.refresh_token;
      session.expires_at = Date.now() + (tokenData.expires_in * 1000);

      // Save updated session
      const encryptedSession = encrypt(JSON.stringify(session));
      res.cookie('poe_session', encryptedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
      });
    } catch (err) {
      console.error('Failed to auto-refresh token:', err.message);
      res.clearCookie('poe_session');
      return null;
    }
  }

  return session;
}

// --- OAuth Router Endpoints ---

// Step 1: Initiate OAuth Login Flow
app.get('/api/auth/login', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  // Save verifier and state in temporary cookies (valid for 10 minutes)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  };

  res.cookie('poe_verifier', verifier, cookieOptions);
  res.cookie('poe_state', state, cookieOptions);

  const authUrl = `https://www.pathofexile.com/oauth/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('account:profile')}` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  res.redirect(authUrl);
});

// Step 2: Callback Handler (GGG redirects back here)
app.get('/api/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth Error: ${error}`);
  }

  // Validate state
  const savedState = req.cookies.poe_state;
  if (!state || state !== savedState) {
    return res.status(400).send('CSRF verification failed: state mismatch');
  }

  const verifier = req.cookies.poe_verifier;
  if (!verifier) {
    return res.status(400).send('OAuth session expired: verifier not found');
  }

  // Exchange authorization code for access token
  const tokenParams = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  if (CLIENT_SECRET) {
    tokenParams.append('client_secret', CLIENT_SECRET);
  }

  try {
    const tokenResponse = await fetch('https://www.pathofexile.com/oauth/token', {
      method: 'POST',
      headers: {
        ...GGG_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
    }

    // Fetch user profile from GGG
    const profileResponse = await fetch('https://api.pathofexile.com/profile', {
      headers: {
        ...GGG_HEADERS,
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      throw new Error(profileData.error?.message || 'Failed to fetch user profile');
    }

    // Save tokens and profile details securely in encrypted session cookie
    const session = {
      username: profileData.name,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    };

    const encryptedSession = encrypt(JSON.stringify(session));

    // Clear temp cookies and set session cookie (lasts 90 days to match refresh token)
    res.clearCookie('poe_verifier');
    res.clearCookie('poe_state');
    res.cookie('poe_session', encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000
    });

    // Redirect user back to the application home page
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error('OAuth Callback Error:', err.message);
    res.status(500).send(`Authentication Failed: ${err.message}`);
  }
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('poe_session');
  res.json({ success: true });
});

// Get user profile link status
app.get('/api/poe/profile', async (req, res) => {
  const session = await getOrRefreshSession(req, res);
  if (!session) {
    return res.json({ loggedIn: false });
  }
  res.json({ loggedIn: true, name: session.username });
});

// Upload Build Proxy Endpoint (Simulates uploading build)
app.post('/api/poe/upload', async (req, res) => {
  const session = await getOrRefreshSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: PoE account not linked' });
  }

  const buildData = req.body;
  if (!buildData || !buildData.name) {
    return res.status(400).json({ error: 'Bad Request: Invalid build JSON' });
  }

  console.log(`Uploading build "${buildData.name}" for account ${session.username}...`);

  // Placeholder: When GGG releases the official endpoint, perform post fetch here
  // headers: 'Authorization': `Bearer ${session.access_token}`
  // body: JSON.stringify(buildData)
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  res.json({
    success: true,
    message: 'Build uploaded successfully!',
    account: session.username,
    timestamp: new Date().toISOString()
  });
});

// --- Proxy Helper for POB2 Import (Bypasses browser CORS) ---
app.get('/api/pob2/fetch', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL parameter' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Proxy target returned HTTP ${response.status}`);
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (err) {
    console.error('POB2 Fetch Proxy Error:', err.message);
    res.status(500).json({ error: `Failed to fetch target URL: ${err.message}` });
  }
});

// Catch-all route to serve React's index.html in production (routing support)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(` PoE2 Build Planner BFF listening on port ${PORT}`);
  console.log(` OAuth Redirect URI: ${REDIRECT_URI}`);
  console.log(`=============================================`);
});
