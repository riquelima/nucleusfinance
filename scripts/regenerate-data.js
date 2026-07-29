/**
 * Script para regenerar o data.js completo a partir da API MaidPad
 * com mapeamento correto de times por DefaultTeam + overrides
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');

const apiKey = 'MTQ1NDpkU3JMeFU0VFZiRE0yTkw2eEJWNWVTYkt0WmNpdE16VHRhdDJwY203Sk1CeHZnMmY5OQ==';
const OUTPUT_PATH = path.join('c:\\Users\\henri\\OneDrive\\Documentos\\Henrique\\Projetos Sistemas\\Nucleus Cleaning Services\\js\\data.js');

// ================================================================
// MAPA DE OVERRIDE: ClientID -> Time correto
// Atualizar aqui se um cliente mudar de time ou tiver DefaultTeam errado.
// ================================================================
const CLIENT_TEAM_OVERRIDE = {
    66399: 2,   // Kelly Field — DefaultTeam:5 na API, mas pertence ao Time 2
};
// ================================================================

async function fetchAll(url) {
    const res = await fetch(url, { headers: { 'Authorization': `Basic ${apiKey}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

function normalizeStatus(rawStatus) {
    const s = (rawStatus || '').toString().trim().toUpperCase();
    if (s === 'UNPAID' || s === 'DUE' || s === 'PENDING' || s === 'NOTPAID') return 'DUE';
    if (s === 'PLANNED' || s === 'SCHEDULED' || s === 'ACTIVE') return 'PLANNED';
    if (s === 'CANCELLED' || s === 'CANCELADO') return 'CANCELLED';
    return 'PAID';
}

function normalizePaidBy(rawPaidBy) {
    const lp = (rawPaidBy || '').toString().toLowerCase();
    if (lp.includes('credit') || lp.includes('card') || lp.includes('stripe')) return 'Cartão Crédito';
    if (lp.includes('debit') || lp.includes('debito')) return 'Cartão Débito';
    if (lp.includes('pix')) return 'Pix';
    if (lp.includes('cash') || lp.includes('dinheiro')) return 'Dinheiro';
    if (lp.includes('ach') || lp.includes('bank')) return 'ACH';
    if (lp.includes('check') || lp.includes('cheque')) return 'Check';
    if (lp.includes('venmo')) return 'Venmo';
    if (lp.includes('zelle')) return 'Zelle';
    return rawPaidBy || 'Zelle';
}

async function run() {
    console.log('Buscando dados da API MaidPad...');

    const [clients, jobs, accJobs, invoices] = await Promise.all([
        fetchAll('https://www.maidpad.com/api/v1/client'),
        fetchAll('https://www.maidpad.com/api/v1/job?fromDate=2026-01-01&toDate=2026-12-31'),
        fetchAll('https://www.maidpad.com/api/v1/accounting/job?fromDate=2026-01-01&toDate=2026-12-31').catch(() => []),
        fetchAll('https://www.maidpad.com/api/v1/accounting/invoice?fromDate=2026-01-01&toDate=2026-12-31').catch(() => []),
    ]);

    console.log(`Clientes: ${clients.length} | Jobs: ${jobs.length} | AccJobs: ${accJobs.length} | Invoices: ${invoices.length}`);

    // Build lookup maps
    const clientMap = {};
    const addressMap = {};
    const clientPrimaryTeamMap = {};
    clients.forEach(c => {
        clientMap[c.ID] = `${c.FirstName || ''} ${c.LastName || ''}`.trim() || c.Reference || `Cliente #${c.ID}`;
        if (c.Addresses && Array.isArray(c.Addresses)) {
            clientPrimaryTeamMap[c.ID] = c.Addresses[0]?.DefaultTeam;
            c.Addresses.forEach(addr => addressMap[addr.ID] = addr);
        }
    });

    const accJobMap = {};
    if (Array.isArray(accJobs)) accJobs.forEach(aj => accJobMap[aj.ID] = aj);

    const invoiceMap = {};
    if (Array.isArray(invoices)) invoices.forEach(inv => invoiceMap[inv.ID] = inv);

    const resultData = { TIME1: [], TIME2: [], TIME3: [], TIME4: [], TIME5: [] };
    const teamStats = { TIME1: 0, TIME2: 0, TIME3: 0, TIME4: 0, TIME5: 0 };

    jobs.forEach(job => {
        const clientName = clientMap[job.ClientID] || `Cliente #${job.ClientID}`;
        const address = addressMap[job.AddressID] || {};
        const primaryTeamId = clientPrimaryTeamMap[job.ClientID];

        // Team resolution: Override > Address.DefaultTeam > clientPrimary > 1
        const overrideTeam = CLIENT_TEAM_OVERRIDE[job.ClientID];
        const teamId = overrideTeam || address.DefaultTeam || primaryTeamId || 1;
        let teamKey = `TIME${teamId}`;
        if (!resultData[teamKey]) teamKey = 'TIME1';

        const charge = parseFloat(job.Charge || 0);
        let rawStatus = 'PLANNED';
        let rawPaidBy = 'Zelle';
        let tip = 0, tax = 0, fee = 0, invoiceNum = 'N/A', paymentDate = '';

        const accJob = accJobMap[job.ID];
        if (accJob) {
            if (accJob.PaymentStatus) rawStatus = accJob.PaymentStatus.toString().trim().toUpperCase();
            if (accJob.PaymentDate) paymentDate = accJob.PaymentDate.split('T')[0];
            if (accJob.PaymentMethod) rawPaidBy = accJob.PaymentMethod;
            if (accJob.TipAmount) tip = parseFloat(accJob.TipAmount || 0);
            if (accJob.InvoiceNumber) invoiceNum = accJob.InvoiceNumber;

            if (accJob.InvoiceID) {
                const inv = invoiceMap[accJob.InvoiceID];
                if (inv) {
                    if (inv.PaymentStatus?.toString().trim().toUpperCase() === 'PAID') rawStatus = 'PAID';
                    if (inv.PaymentMethod && !accJob.PaymentMethod) rawPaidBy = inv.PaymentMethod;
                    if (inv.PaymentDate && !paymentDate) paymentDate = inv.PaymentDate.split('T')[0];
                    if (inv.TipAmount && tip === 0) tip = parseFloat(inv.TipAmount || 0);
                    if (inv.TaxAmount) tax = parseFloat(inv.TaxAmount || 0);
                    if (inv.ConvenienceFeeAmount) fee = parseFloat(inv.ConvenienceFeeAmount || 0);
                }
            }
        }

        let formattedDate = (job.JobDate || '').toString().trim();
        if (formattedDate.includes('T')) formattedDate = formattedDate.split('T')[0];
        if (formattedDate.includes(' ')) formattedDate = formattedDate.split(' ')[0];

        const record = {
            date: formattedDate,
            trans_type: 'Cleaning',
            client: clientName,
            description: `${job.Frequency || 'OneTime'} (${job.JobTimeFrom || ''})`,
            state: address.State || 'NJ',
            status: normalizeStatus(rawStatus),
            subtotal: charge,
            tax, tip, fee,
            total: charge + tip + tax + fee,
            paid_by: normalizePaidBy(rawPaidBy),
            invoice_num: invoiceNum,
            notes: `Fatura: ${invoiceNum}. ${address.Street || ''}, ${address.City || ''}`
        };

        resultData[teamKey].push(record);
        teamStats[teamKey]++;
    });

    // Sort records by date within each team
    Object.keys(resultData).forEach(k => {
        resultData[k].sort((a, b) => a.date.localeCompare(b.date));
    });

    // Compute July 2026 totals for validation
    console.log('\n=== RESUMO JULHO 2026 POR TIME ===');
    Object.keys(resultData).forEach(k => {
        const julRecs = resultData[k].filter(r => r.date.startsWith('2026-07'));
        const total = julRecs.reduce((acc, r) => acc + r.total, 0);
        console.log(`${k}: ${julRecs.length} jobs, $${total.toFixed(2)}`);
    });
    console.log(`\nTotal de registros: ${Object.values(teamStats).reduce((a, b) => a + b, 0)}`);

    // Write data.js
    const output = `window.INITIAL_SHEET_DATA = ${JSON.stringify(resultData, null, 2)};\n`;
    fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
    console.log(`\n✅ data.js regenerado com sucesso! (${Math.round(output.length / 1024)} KB)`);
}

run().catch(e => console.error('ERRO:', e.message));
