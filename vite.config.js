import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';
import https from 'node:https';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:5173',
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: ' + err.message);
            }
          });
        },
        bypass: async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const targetUrl = url.searchParams.get('url');
          
          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'No URL provided' }));
            return true;
          }

          try {
            const parsedUrl = new URL(targetUrl);
            
            // Security check - only allow j-archive.com
            if (parsedUrl.hostname !== 'j-archive.com') {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: `Domain ${parsedUrl.hostname} not allowed` }));
              return true;
            }
            
            const options = {
              hostname: parsedUrl.hostname,
              path: parsedUrl.pathname + parsedUrl.search,
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            };
            
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            const proxyRequest = new Promise((resolve, reject) => {
              const proxyReq = client.request(options, (proxyRes) => {
                let body = '';
                proxyRes.on('data', (chunk) => {
                  body += chunk;
                });
                
                proxyRes.on('end', () => {
                  res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'] || 'text/html',
                    'Access-Control-Allow-Origin': '*',
                  });
                  res.end(body);
                  resolve();
                });
              });
              
              proxyReq.on('error', (err) => {
                console.error('Request error:', err);
                res.writeHead(500, {
                  'Content-Type': 'text/plain',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end('Request error: ' + err.message);
                reject(err);
              });
              
              proxyReq.end();
            });
            
            await proxyRequest;
            return true;
          } catch (err) {
            console.error('Proxy error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
            return true;
          }
        }
      }
    }
  }
});