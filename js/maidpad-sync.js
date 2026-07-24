/**
 * Nucleus Cleaning Services - MaidPad API Integration Sync Module
 * Manages secure calls to /api/maidpad proxy and formats data to the Nucleus model
 */

window.MaidPadSyncModule = {
    API_URL: '/api/maidpad',

    /**
     * Test connection with MaidPad API using the serverless proxy
     */
    async testConnection(apiKey = '') {
        try {
            let url = `${this.API_URL}?action=checkConnection`;
            if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;
            
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            console.error('Error testing connection:', e);
            return { success: false, error: 'Erro de rede ao conectar com a API Serverless.' };
        }
    },

    /**
     * Fetch list of clients from MaidPad API
     */
    async fetchClients(apiKey = '') {
        let url = `${this.API_URL}?action=listClients`;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;

        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Erro ao buscar clientes.');
        }
        return await res.json();
    },

    /**
     * Fetch list of jobs from MaidPad API
     */
    async fetchJobs(apiKey = '', fromDate = '2026-01-01', toDate = '2026-12-31') {
        let url = `${this.API_URL}?action=listJobs&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;

        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Erro ao buscar agendamentos.');
        }
        return await res.json();
    },

    /**
     * Create client in MaidPad
     */
    async createClient(clientData, apiKey = '') {
        const url = `${this.API_URL}?action=createClient`;
        const payload = { client: clientData };
        if (apiKey) payload.apiKey = apiKey;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.details || data.error || 'Erro ao cadastrar cliente.');
        }
        return data;
    },

    /**
     * Create job in MaidPad
     */
    async createJob(jobData, apiKey = '') {
        const url = `${this.API_URL}?action=createJob`;
        const payload = { job: jobData };
        if (apiKey) payload.apiKey = apiKey;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.details || data.error || 'Erro ao cadastrar agendamento.');
        }
        return data;
    },

    /**
     * Fetch all data and map it to the Nucleus internal model structure:
     * { "TIME1": [...], "TIME2": [...], ... }
     */
    async syncAllData(apiKey = '') {
        console.log('Iniciando sincronização MaidPad...');
        
        // Fetch clients and jobs in parallel
        const [clients, jobs] = await Promise.all([
            this.fetchClients(apiKey),
            this.fetchJobs(apiKey, '2026-01-01', '2026-12-31')
        ]);

        // Map clients by ID for rapid lookup
        const clientMap = {};
        const addressMap = {};

        clients.forEach(c => {
            clientMap[c.ID] = `${c.FirstName} ${c.LastName}`.trim() || c.Reference || `Cliente #${c.ID}`;
            if (c.Addresses && Array.isArray(c.Addresses)) {
                c.Addresses.forEach(addr => {
                    addressMap[addr.ID] = addr;
                });
            }
        });

        // Initialize target object matching the Teams lists structure
        const resultData = {
            'TIME1': [],
            'TIME2': [],
            'TIME3': [],
            'TIME4': [],
            'TIME5': []
        };

        jobs.forEach(job => {
            const clientName = clientMap[job.ClientID] || `Cliente #${job.ClientID}`;
            const address = addressMap[job.AddressID] || {};
            
            // Map DefaultTeam ID to TIME key (1 -> TIME1, etc.)
            const defaultTeamId = address.DefaultTeam;
            let teamKey = `TIME${defaultTeamId}`;
            
            // Fallback if team is invalid or not in range 1-5
            if (!resultData[teamKey]) {
                // If it is not a valid team, let's distribute it evenly or fallback to TIME1
                teamKey = 'TIME1';
            }

            const charge = parseFloat(job.Charge || 0.0);
            
            // Determinar status dinamicamente do job
            const rawStatus = (job.PaymentStatus || job.InvoiceStatus || job.Status || 'PAID').toString().trim().toUpperCase();
            let status = 'PAID';
            if (rawStatus === 'UNPAID' || rawStatus === 'DUE' || rawStatus === 'PENDING') {
                status = 'DUE';
            } else if (rawStatus === 'PLANNED' || rawStatus === 'SCHEDULED' || rawStatus === 'ACTIVE') {
                status = 'PLANNED';
            } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELADO') {
                status = 'CANCELLED';
            }

            // Determinar forma de pagamento dinamicamente do job
            const rawPaidBy = job.PaymentMethod || job.PaymentType || job.PaidBy || job.Method || job.Source || 'Zelle';
            let paidBy = 'Zelle';
            const lowerPaid = rawPaidBy.toString().toLowerCase();
            if (lowerPaid.includes('credit') || lowerPaid.includes('card') || lowerPaid.includes('stripe') || lowerPaid.includes('cartao')) {
                paidBy = 'Cartão Crédito';
            } else if (lowerPaid.includes('debit') || lowerPaid.includes('debito')) {
                paidBy = 'Cartão Débito';
            } else if (lowerPaid.includes('pix')) {
                paidBy = 'Pix';
            } else if (lowerPaid.includes('cash') || lowerPaid.includes('dinheiro')) {
                paidBy = 'Dinheiro';
            } else if (lowerPaid.includes('ach') || lowerPaid.includes('bank')) {
                paidBy = 'ACH';
            } else if (lowerPaid.includes('check') || lowerPaid.includes('cheque')) {
                paidBy = 'Check';
            } else if (lowerPaid.includes('venmo')) {
                paidBy = 'Venmo';
            } else if (lowerPaid.includes('zelle')) {
                paidBy = 'Zelle';
            } else {
                paidBy = rawPaidBy;
            }

            // Build Nucleus standard record
            const record = {
                date: job.JobDate, // format: "YYYY-MM-DD"
                trans_type: "Cleaning",
                client: clientName,
                description: `${job.Frequency || 'OneTime'} (${job.JobTimeFrom} - ${job.JobTimeTo})`,
                state: address.State || 'NJ',
                status: status,
                subtotal: charge,
                tax: 0.0,
                tip: 0.0,
                fee: 0.0,
                total: charge,
                paid_by: paidBy,
                notes: `Frequência: ${job.Frequency}. Endereço: ${address.Street || ''}, ${address.City || ''}`
            };

            resultData[teamKey].push(record);
        });

        return {
            convertedData: resultData,
            rawClients: clients,
            rawJobs: jobs
        };
    }
};
