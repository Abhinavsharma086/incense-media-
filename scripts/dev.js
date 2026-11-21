import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'GET', path: '/api/leads/workload', timeout: 1500 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

let backendProcess = null;

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '⚡ Starting Incense Media Full Stack Development Environment...');

  // Check if .env points to remote live API
  const fs = await import('fs');
  const envPath = path.resolve(rootDir, '.env');
  let useLiveApi = false;
  let apiUrl = 'https://api.incensemedia.in';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_API_BASE_URL\s*=\s*(.*)/);
    if (match && match[1]) {
      apiUrl = match[1].trim();
      if (!apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
        useLiveApi = true;
      }
    }
  }

  if (useLiveApi) {
    console.log('\x1b[32m%s\x1b[0m', `✓ Connected to LIVE Production API: ${apiUrl}`);
    console.log('\x1b[90m%s\x1b[0m', '  (Skipping local backend server since frontend is configured for live server)');
  } else {
    const backendAlreadyRunning = await isPortOpen(5000);
    if (backendAlreadyRunning) {
      console.log('\x1b[32m%s\x1b[0m', '✓ Local backend server is already running on http://localhost:5000');
    } else {
      console.log('\x1b[33m%s\x1b[0m', '🚀 Launching local backend API server on port 5000...');
      backendProcess = spawn('node', ['dist/index.js'], {
        cwd: backendDir,
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, PORT: '5000' }
      });

      backendProcess.on('error', (err) => {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to start backend:', err.message);
      });
    }
  }

  console.log('\x1b[34m%s\x1b[0m', '✨ Launching Vite frontend on port 3000...');
  const viteProcess = spawn('npx', ['vite'], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit'
  });

  const cleanup = () => {
    if (backendProcess) {
      try { backendProcess.kill(); } catch (e) {}
    }
    if (viteProcess) {
      try { viteProcess.kill(); } catch (e) {}
    }
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

main().catch(console.error);
