/**
 * Nucleus Cleaning Services - Local Dev Server
 * Emulates Vercel Serverless Functions and serves frontend assets.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 50269;

// Carrega variáveis do arquivo .env local se ele existir para simular o ambiente Vercel
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
    envLines.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove aspas
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value.trim();
        }
    });
}


const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Rota API Gateway Proxy Dinâmico (Emulador Vercel Serverless)
    if (pathname.startsWith('/api/')) {
        const apiName = pathname.replace('/api/', '').split('?')[0];
        const apiFilePath = path.join(__dirname, 'api', `${apiName}.js`);

        if (fs.existsSync(apiFilePath)) {
            try {
                // Emula o parser de query string da Vercel
                req.query = parsedUrl.query || {};

                // Limpa o cache do require para aceitar alterações a quente
                delete require.cache[require.resolve(apiFilePath)];
                const apiHandler = require(apiFilePath);

                // Mock de response parecido com o Vercel Serverless (Express-like)
                const customRes = {
                    statusCode: 200,
                    headers: {},
                    setHeader(name, value) {
                        this.headers[name] = value;
                        res.setHeader(name, value);
                        return this;
                    },
                    status(code) {
                        this.statusCode = code;
                        res.statusCode = code;
                        return this;
                    },
                    json(data) {
                        this.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                        return this;
                    },
                    end(data) {
                        res.end(data);
                        return this;
                    }
                };

                // Trata parsing do corpo da requisição POST
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', () => {
                        try {
                            req.body = body ? JSON.parse(body) : {};
                        } catch (e) {
                            req.body = body;
                        }
                        apiHandler(req, customRes);
                    });
                } else {
                    req.body = {};
                    apiHandler(req, customRes);
                }
            } catch (err) {
                console.error(`Erro ao executar a Serverless API local (${apiName}):`, err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Erro interno no servidor local', details: err.message }));
            }
            return;
        }
    }

    // Servir arquivos estáticos do frontend
    let filePath = path.join(__dirname, pathname === '/' ? 'dashboard.html' : pathname);

    // Se o arquivo não existir, retorna para o dashboard.html (SPA Fallback)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, 'dashboard.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.png': 'image/png'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Erro ao carregar o arquivo: ${err.code}`);
        } else {
            res.statusCode = 200;
            res.setHeader('Content-Type', contentType);
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 NUCLEUS DEV SERVER COM BACKEND EMULADO RODANDO`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`Variável MAIDPAD_API_KEY no ambiente: ${process.env.MAIDPAD_API_KEY ? 'Sim' : 'Não'}`);
    console.log(`======================================================\n`);
});
