/**
 * Vercel Serverless Function - Manual Expenses Module
 * Nucleus Financial Control - Google Sheets CRUD Gateway
 */

const crypto = require('crypto');

const SPREADSHEET_ID = '1WuwFpLmklVJTfI4xDKRzdXZw2-zJ40lcDfpzyG1D8Mc';
const SHEET_NAME = 'Manual Expenses';

module.exports = async (req, res) => {
    // CORS Headers
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

    const action = req.query.action || (req.body && req.body.action);
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    // Se as credenciais do Google Sheets não estiverem configuradas, responde com useFallback: true
    if (!clientEmail || !privateKeyRaw) {
        console.warn('Variáveis GOOGLE_SERVICE_ACCOUNT_EMAIL ou GOOGLE_PRIVATE_KEY não configuradas. Usando modo LocalStorage Fallback.');
        return res.status(200).json({
            useFallback: true,
            message: 'Rodando sob modo LocalStorage Fallback (Sem conexão com Google Sheets).'
        });
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    // Helper para gerar o token de acesso OAuth2 usando JWT nativo
    async function getAccessToken() {
        const claimSet = {
            iss: clientEmail,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        };

        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
        
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(`${header}.${claim}`);
        const signature = sign.sign(privateKey, 'base64url');
        const jwt = `${header}.${claim}.${signature}`;

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Erro ao gerar Token OAuth2: ${errorText}`);
        }

        const data = await tokenResponse.json();
        return data.access_token;
    }

    // Helper para criar a aba 'Manual Expenses' caso ela não exista
    async function createSheetIfNotExists(accessToken) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
        
        // Verifica se a aba já existe
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`;
        const metaRes = await fetch(metaUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!metaRes.ok) {
            throw new Error('Erro ao ler metadados da planilha.');
        }
        
        const meta = await metaRes.json();
        const exists = meta.sheets.some(s => s.properties.title === SHEET_NAME);
        
        if (exists) return;

        // Se não existir, cria a aba e inicializa o cabeçalho
        const createRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    {
                        addSheet: {
                            properties: { title: SHEET_NAME }
                        }
                    }
                ]
            })
        });

        if (!createRes.ok) {
            const errTxt = await createRes.text();
            throw new Error(`Erro ao criar a aba ${SHEET_NAME}: ${errTxt}`);
        }

        // Inicializa a primeira linha com o cabeçalho
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:L1:append?valueInputOption=USER_ENTERED`;
        await fetch(appendUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[
                    'ID', 'Data', 'Categoria', 'Centro de Custo', 'Descrição', 'Valor', 'Forma de Pagamento', 'Status', 'Observações', 'Criado em', 'Atualizado em'
                ]]
            })
        });
    }

    try {
        const token = await getAccessToken();
        await createSheetIfNotExists(token);

        if (action === 'list') {
            const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:L`;
            const response = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: 'Erro ao carregar despesas manuais.' });
            }

            const data = await response.json();
            const rows = data.values || [];
            
            // Mapeia as linhas para objetos excluindo o cabeçalho
            const expenses = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length === 0 || !row[0]) continue;
                
                expenses.push({
                    rowNumber: i + 1, // Mantém a referência da linha para updates/deletes rápidos
                    id: row[0],
                    date: row[1] || '',
                    category: row[2] || '',
                    centro: row[3] || '',
                    desc: row[4] || '',
                    value: parseFloat(row[5] || 0),
                    paid_by: row[6] || '',
                    status: row[7] || '',
                    notes: row[8] || '',
                    created_at: row[9] || '',
                    updated_at: row[10] || ''
                });
            }

            return res.status(200).json({ useFallback: false, expenses });

        } else if (action === 'create') {
            const expense = req.body.expense;
            if (!expense) return res.status(400).json({ error: 'Parâmetro expense é obrigatório.' });

            const rowData = [
                expense.id || `EXP-${Date.now()}`,
                expense.date,
                expense.category,
                expense.centro,
                expense.desc,
                expense.value,
                expense.paid_by,
                expense.status,
                expense.notes || '',
                new Date().toISOString(),
                new Date().toISOString()
            ];

            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:L:append?valueInputOption=USER_ENTERED`;
            const response = await fetch(appendUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [rowData] })
            });

            if (!response.ok) {
                const errTxt = await response.text();
                return res.status(response.status).json({ error: 'Erro ao gravar despesa na planilha.', details: errTxt });
            }

            return res.status(200).json({ success: true, message: 'Despesa criada com sucesso na planilha!' });

        } else if (action === 'update') {
            const expense = req.body.expense;
            if (!expense || !expense.id) return res.status(400).json({ error: 'Parâmetro expense com ID é obrigatório.' });

            // Busca todas as linhas para localizar a correta pelo ID
            const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:A`;
            const listRes = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!listRes.ok) return res.status(listRes.status).json({ error: 'Erro ao localizar despesa na planilha.' });
            
            const listData = await listRes.json();
            const rows = listData.values || [];
            let targetRow = -1;

            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === expense.id) {
                    targetRow = i + 1; // 1-indexed
                    break;
                }
            }

            if (targetRow === -1) {
                return res.status(404).json({ error: 'Despesa não encontrada na planilha.' });
            }

            const rowData = [
                expense.id,
                expense.date,
                expense.category,
                expense.centro,
                expense.desc,
                expense.value,
                expense.paid_by,
                expense.status,
                expense.notes || '',
                expense.created_at || new Date().toISOString(),
                new Date().toISOString()
            ];

            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A${targetRow}:K${targetRow}?valueInputOption=USER_ENTERED`;
            const response = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [rowData] })
            });

            if (!response.ok) {
                const errTxt = await response.text();
                return res.status(response.status).json({ error: 'Erro ao atualizar despesa na planilha.', details: errTxt });
            }

            return res.status(200).json({ success: true, message: 'Despesa atualizada com sucesso na planilha!' });

        } else if (action === 'delete') {
            const id = req.query.id || (req.body && req.body.id);
            if (!id) return res.status(400).json({ error: 'Parâmetro ID é obrigatório.' });

            // Busca as linhas da coluna A para encontrar o ID correspondente
            const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:A`;
            const listRes = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!listRes.ok) return res.status(listRes.status).json({ error: 'Erro ao localizar despesa para deletar.' });
            
            const listData = await listRes.json();
            const rows = listData.values || [];
            let targetRow = -1;

            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === id) {
                    targetRow = i + 1;
                    break;
                }
            }

            if (targetRow === -1) {
                return res.status(404).json({ error: 'Despesa não encontrada para deleção.' });
            }

            // Limpa os valores da linha específica
            const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A${targetRow}:K${targetRow}:clear`;
            const response = await fetch(clearUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: 'Erro ao deletar despesa na planilha.' });
            }

            return res.status(200).json({ success: true, message: 'Despesa deletada com sucesso da planilha!' });

        } else {
            return res.status(400).json({ error: 'Ação de manual-expenses desconhecida ou não informada.' });
        }

    } catch (err) {
        console.error('Serverless Manual Expenses Error:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'Erro de comunicação com a planilha do Google.'
        });
    }
};
