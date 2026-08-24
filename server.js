// server.js — Node.js server for the portfolio
// Two goals: (1) pre-fetch GitHub data so it's in the HTML on arrival,
// (2) serve assets with compression + caching so repeat visits are instant.

import express from 'express';
import compression from 'compression';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── COMPRESSION ──────────────────────────────────────────────────────────────
// Gzip every response automatically. This shrinks scene.js, ui.js, style.css
// by ~65-75%. The browser decompresses in milliseconds — net win.
app.use(compression());

// ── STATIC FILES WITH CACHING ─────────────────────────────────────────────────
// Images and fonts almost never change, so we tell the browser:
// "cache this for 1 year — don't even ask us if it's fresh."
// On repeat visits, hm.png, Photos/, etc. load from disk — zero network cost.
app.use('/assets', express.static(join(__dirname, '.'), {
  maxAge: '1y',
  immutable: true,
}));

// JS and CSS change sometimes, so 1 hour cache. Browser will re-check after that.
app.use(express.static(__dirname, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    // Images almost never change — cache for 1 year
    if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// ── GITHUB DATA — SERVER-SIDE FETCH ──────────────────────────────────────────
// The problem with fetching GitHub data in the browser (what ui.js currently
// does): the user arrives at the page, JS loads, then JS makes 3 API calls,
// then the numbers appear. They see "—" for ~500ms first.
//
// Server fix: WE fetch the data before sending the HTML. The numbers are
// already in the page when it arrives. Zero loading state.
//
// We also cache the result for 5 minutes so 100 visitors in a row don't each
// trigger a GitHub API call — they all get the same cached snapshot.

const GITHUB_USER = 'EvuhLi';
let ghCache = null;
let ghCacheTime = 0;
const GH_TTL = 5 * 60 * 1000; // 5 minutes

async function getGithubData() {
  const now = Date.now();
  if (ghCache && now - ghCacheTime < GH_TTL) {
    return ghCache; // Return cached data — no API call needed
  }

  try {
    const headers = { 'User-Agent': 'evali-portfolio' };
    const [user, repos, commits] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers }).then(r => r.json()),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`, { headers }).then(r => r.json()),
      fetch(`https://api.github.com/search/commits?q=author:${GITHUB_USER}&per_page=1`, {
        headers: { ...headers, Accept: 'application/vnd.github.cloak-preview+json' }
      }).then(r => r.json()),
    ]);

    const langBytes = {};
    if (Array.isArray(repos)) {
      repos.forEach(r => {
        if (r.language) langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1);
      });
    }

    ghCache = {
      repos: user.public_repos ?? null,
      commits: commits.total_count ?? null,
      langs: Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l),
      fetchedAt: new Date().toISOString(),
    };
    ghCacheTime = now;
    console.log('[server] Fetched fresh GitHub data');
  } catch (err) {
    console.error('[server] GitHub fetch failed:', err.message);
    ghCache = ghCache ?? { repos: null, commits: null, langs: [], fetchedAt: null };
  }

  return ghCache;
}

// ── MAIN ROUTE ────────────────────────────────────────────────────────────────
// This is the key step: we fetch GitHub data and read index.html IN PARALLEL
// (Promise.all), then inject the data into the HTML before sending it.
//
// The browser receives one complete HTML file with:
//   - A <script id="gh-data"> tag containing the pre-fetched GitHub stats
//   - That script tag is JSON — ui.js will read it instead of calling the API
//
// This pattern is called "server-side data injection" or "inline data hydration."
app.get('/', async (req, res) => {
  const [html, ghData] = await Promise.all([
    readFile(join(__dirname, 'index.html'), 'utf8'),
    getGithubData(),
  ]);

  // Embed GitHub data as an inline JSON script tag.
  // Why a <script type="application/json">? It's inert — browser doesn't execute it.
  // It's just a vessel for data that our JS can read with JSON.parse(el.textContent).
  const dataTag = `<script id="gh-data" type="application/json">${JSON.stringify(ghData)}</script>`;

  // Inject right before </body> so it's available when ui.js runs
  const injectedHtml = html.replace('</body>', `${dataTag}\n</body>`);

  // Tell browser not to cache the HTML itself — we always want fresh data
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/html');
  res.send(injectedHtml);
});

app.listen(PORT, () => {
  console.log(`\nPortfolio server running at http://localhost:${PORT}`);
  console.log('GitHub stats will be pre-fetched server-side — no loading flash!\n');
});
