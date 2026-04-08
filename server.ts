import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

// --- API Routes ---

app.get('/api/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in a secure cookie
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>認証に成功しました。このウィンドウを閉じてください。</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokens });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

// Helper to get authenticated sheets client
async function getSheetsClient(tokens: any) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/callback`
  );
  client.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth: client });
}

app.post('/api/sheets/sync', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = JSON.parse(tokensStr);
  const { data, spreadsheetId } = req.body;

  try {
    const sheets = await getSheetsClient(tokens);
    let targetId = spreadsheetId;

    // 1. Create spreadsheet if not exists
    if (!targetId) {
      const ss = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: 'GK IDP Hub Data Backup' },
        },
      });
      targetId = ss.data.spreadsheetId;
    }

    // 2. Write data to a specific cell (we'll store the whole JSON in one cell for simplicity, or we could structure it)
    // For a real app, structuring is better, but for "persistence", a JSON dump in a hidden sheet or cell is a quick way.
    // Let's use a "Data" sheet.
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: targetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[JSON.stringify(data)]],
      },
    });

    res.json({ success: true, spreadsheetId: targetId });
  } catch (error) {
    console.error('Sheets sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Google Sheets' });
  }
});

app.get('/api/sheets/load', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = JSON.parse(tokensStr);
  const { spreadsheetId } = req.query;

  if (!spreadsheetId) return res.status(400).json({ error: 'Spreadsheet ID required' });

  try {
    const sheets = await getSheetsClient(tokens);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId as string,
      range: 'Sheet1!A1',
    });

    const values = response.data.values;
    if (values && values[0] && values[0][0]) {
      res.json({ data: JSON.parse(values[0][0]) });
    } else {
      res.json({ data: null });
    }
  } catch (error) {
    console.error('Sheets load error:', error);
    res.status(500).json({ error: 'Failed to load from Google Sheets' });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
