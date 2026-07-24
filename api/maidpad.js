/**
 * Vercel Serverless Function Proxy for MaidPad API Integration
 * Nucleus Financial Control - MaidPad Gateway
 */

module.exports = async (req, res) => {
    // Set CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // A chave de API do MaidPad. Pode vir do Environment Variable ou do body/query para testes locais rápidos.
    const apiKey = process.env.MAIDPAD_API_KEY || req.query.apiKey || (req.body && req.body.apiKey);
    
    if (!apiKey) {
        return res.status(400).json({ 
            error: 'Chave de API do MaidPad (MAIDPAD_API_KEY) não configurada.',
            details: 'Configure a variável de ambiente MAIDPAD_API_KEY no painel da Vercel ou envie a chave nas requisições.'
        });
    }

    const action = req.query.action || (req.body && req.body.action);
    const MAIDPAD_BASE_URL = 'https://www.maidpad.com/api/v1';

    // A documentação diz: "JWT token in the Authorization header with the Basic schema"
    // Vamos tentar variações de cabeçalhos de autenticação Basic:
    // 1. Literal: Basic <JWT>
    // 2. Base64 com username/senha vazia: Basic Base64(JWT:)
    // 3. Base64 puro do token: Basic Base64(JWT)
    
    let authHeader = apiKey.startsWith('Basic ') ? apiKey : `Basic ${apiKey}`;

    // Função utilitária para fazer requisições com tentativas de fallback de cabeçalho
    async function fetchMaidpad(url, options = {}) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = authHeader;

        let response = await fetch(url, options);

        // Se falhar por autenticação e não for um cabeçalho customizado inserido pelo usuário
        if ((response.status === 400 || response.status === 401 || response.status === 403) && !apiKey.startsWith('Basic ')) {
            console.log('Autenticação padrão falhou (status ' + response.status + '). Tentando fallback Base64 (JWT:)...');
            
            // Fallback 1: Codificação Basic padrão Base64(JWT + ":")
            const base64Creds = Buffer.from(`${apiKey.trim()}:`).toString('base64');
            options.headers['Authorization'] = `Basic ${base64Creds}`;
            
            let retryResponse = await fetch(url, options);
            if (retryResponse.ok) {
                authHeader = `Basic ${base64Creds}`;
                return retryResponse;
            }

            console.log('Fallback Base64 (JWT:) falhou. Tentando fallback Base64 do JWT puro...');
            
            // Fallback 2: Codificação Basic Base64(JWT)
            const base64Token = Buffer.from(apiKey.trim()).toString('base64');
            options.headers['Authorization'] = `Basic ${base64Token}`;
            
            let retryResponse2 = await fetch(url, options);
            if (retryResponse2.ok) {
                authHeader = `Basic ${base64Token}`;
                return retryResponse2;
            }
        }

        return response;
    }

    try {
        if (action === 'checkConnection') {
            console.log('Testando conexão com o MaidPad...');
            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/client`, {
                method: 'GET'
            });

            if (response.ok) {
                return res.status(200).json({ success: true, message: 'Conexão com MaidPad estabelecida com sucesso!' });
            } else {
                const errText = await response.text();
                return res.status(response.status).json({ 
                    success: false, 
                    error: `Chave de API inválida ou expirada (${response.status})`,
                    details: errText 
                });
            }

        } else if (action === 'listClients') {
            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/client`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: 'Erro ao listar clientes do MaidPad', details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'getClient') {
            const id = req.query.id || (req.body && req.body.id);
            if (!id) return res.status(400).json({ error: 'Parâmetro ID do cliente é obrigatório.' });

            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/client/${id}`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: `Erro ao obter cliente ID ${id} do MaidPad`, details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'createClient') {
            const clientData = req.body.client;
            if (!clientData) {
                return res.status(400).json({ error: 'Dados do cliente ("client") não fornecidos.' });
            }

            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: 'Erro ao criar cliente no MaidPad', details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'listJobs') {
            const clientID = req.query.clientID || (req.body && req.body.clientID);
            const fromDate = req.query.fromDate || (req.body && req.body.fromDate);
            const toDate = req.query.toDate || (req.body && req.body.toDate);
            
            let url = `${MAIDPAD_BASE_URL}/job`;
            const params = [];
            if (clientID) params.push(`clientID=${clientID}`);
            if (fromDate) params.push(`fromDate=${fromDate}`);
            if (toDate) params.push(`toDate=${toDate}`);
            
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const response = await fetchMaidpad(url, {
                method: 'GET'
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: 'Erro ao listar agendamentos do MaidPad', details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'getJob') {
            const id = req.query.id || (req.body && req.body.id);
            if (!id) return res.status(400).json({ error: 'Parâmetro ID do serviço é obrigatório.' });

            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/job/${id}`, {
                method: 'GET'
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: `Erro ao obter serviço ID ${id} do MaidPad`, details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'createJob') {
            const jobData = req.body.job;
            if (!jobData) {
                return res.status(400).json({ error: 'Dados do serviço ("job") não fornecidos.' });
            }

            const response = await fetchMaidpad(`${MAIDPAD_BASE_URL}/job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: 'Erro ao criar serviço no MaidPad', details: errText });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else {
            return res.status(400).json({ error: 'Ação desconhecida ou não informada.' });
        }

    } catch (err) {
        console.error('Serverless Proxy Error:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'Erro de comunicação com a API do MaidPad'
        });
    }
};
