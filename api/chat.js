/**
 * Vercel Serverless Function Proxy for Nucleus IA
 * Nucleus Financial Control - Native Intelligence Endpoint
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, apiKey } = req.body || {};

        const defaultKey = 'sk-cp-meaN0PHZdGi3-5gZffia9b6PyDIh27vyk54LwG6gw965dFLWoIHowFo19rTqoHdbxhaQezJlMMBgTEYhNni51sJnMWCcPHIKtCg4GRY-pGMmrXarNIxxGQA';
        const keyToUse = process.env.MINIMAX_API_KEY || apiKey || defaultKey;

        if (!keyToUse) {
            return res.status(400).json({ error: 'API key is missing.' });
        }

        const minimaxUrl = 'https://api.minimaxi.chat/v1/chat/completions';

        const payload = {
            model: 'MiniMax-Text-01',
            messages: messages || [],
            temperature: 0.3,
            top_p: 0.95,
            max_tokens: 2048
        };

        const response = await fetch(minimaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyToUse}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Nucleus IA Backend Error:', response.status, errText);
            return res.status(response.status).json({
                error: `Service Error (${response.status})`,
                details: errText
            });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error('Serverless Chat Handler Error:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'Error communicating with Intelligence Service'
        });
    }
};
