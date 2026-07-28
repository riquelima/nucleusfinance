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
     * Fetch Payroll list from MaidPad API Accounting/Payroll
     */
    async fetchPayroll(apiKey = '', fromDate = '2026-01-01', toDate = '2026-12-31') {
        let url = `${this.API_URL}?action=listPayroll&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;

        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Erro ao buscar folha de pagamento (Payroll).');
        }
        return await res.json();
    },

    /**
     * Fetch list of Accounting Jobs from MaidPad API
     */
    async fetchAccountingJobs(apiKey = '', fromDate = '2026-01-01', toDate = '2026-12-31') {
        let url = `${this.API_URL}?action=listAccountingJobs&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;

        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Erro ao buscar Accounting Jobs.');
        }
        return await res.json();
    },

    /**
     * Fetch list of Accounting Invoices from MaidPad API
     */
    async fetchAccountingInvoices(apiKey = '', fromDate = '2026-01-01', toDate = '2026-12-31') {
        let url = `${this.API_URL}?action=listAccountingInvoices&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;

        const res = await fetch(url);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || errData.error || 'Erro ao buscar Accounting Invoices.');
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
        console.log('Iniciando sincronização contábil completa do MaidPad...');
        
        // Fetch clients, jobs, accounting jobs, and accounting invoices in parallel
        const [clients, jobs, accJobs, invoices] = await Promise.all([
            this.fetchClients(apiKey),
            this.fetchJobs(apiKey, '2026-01-01', '2026-12-31'),
            this.fetchAccountingJobs(apiKey, '2026-01-01', '2026-12-31'),
            this.fetchAccountingInvoices(apiKey, '2026-01-01', '2026-12-31')
        ]);

        // Map clients by ID for rapid lookup and team preference
        const clientMap = {};
        const clientPrimaryTeamMap = {};
        const addressMap = {};

        clients.forEach(c => {
            clientMap[c.ID] = `${c.FirstName} ${c.LastName}`.trim() || c.Reference || `Cliente #${c.ID}`;
            if (c.Addresses && Array.isArray(c.Addresses) && c.Addresses.length > 0) {
                // Time primário configurado no cadastro do cliente
                clientPrimaryTeamMap[c.ID] = c.Addresses[0].DefaultTeam;
                c.Addresses.forEach(addr => {
                    addressMap[addr.ID] = addr;
                });
            }
        });

        // Map Accounting Jobs by ID
        const accJobMap = {};
        if (Array.isArray(accJobs)) {
            accJobs.forEach(aj => {
                accJobMap[aj.ID] = aj;
            });
        }

        // Map Invoices by ID
        const invoiceMap = {};
        if (Array.isArray(invoices)) {
            invoices.forEach(inv => {
                invoiceMap[inv.ID] = inv;
            });
        }

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
            const primaryTeamId = clientPrimaryTeamMap[job.ClientID];
            
            // Prioridade do Time: Time do Job -> Time Principal do Cliente -> Time Específico do Endereço
            const defaultTeamId = job.TeamID || job.Team || job.DefaultTeam || primaryTeamId || address.DefaultTeam || 1;
            let teamKey = `TIME${defaultTeamId}`;
            
            // Fallback se o time não estiver na faixa 1-5
            if (!resultData[teamKey]) {
                teamKey = 'TIME1';
            }

            const charge = parseFloat(job.Charge || 0.0);
            
            // 1. Resolver status, pagamentos e gorjetas cruzando com os endpoints contábeis
            let rawStatus = (job.PaymentStatus || job.InvoiceStatus || job.Status || 'PAID').toString().trim().toUpperCase();
            let rawPaidBy = job.PaymentMethod || job.PaymentType || job.PaidBy || job.Method || job.Source || 'Zelle';
            let tip = 0.0;
            let tax = 0.0;
            let fee = 0.0;
            let invoiceNum = 'N/A';
            let paymentDate = '';

            const accJob = accJobMap[job.ID];
            if (accJob) {
                if (accJob.PaymentStatus) {
                    rawStatus = accJob.PaymentStatus.toString().trim().toUpperCase();
                }
                if (accJob.PaymentDate) {
                    paymentDate = accJob.PaymentDate.split('T')[0];
                }
                if (accJob.PaymentMethod) {
                    rawPaidBy = accJob.PaymentMethod;
                }
                if (accJob.TipAmount) {
                    tip = parseFloat(accJob.TipAmount || 0);
                }
                if (accJob.InvoiceNumber) {
                    invoiceNum = accJob.InvoiceNumber;
                }

                // Cruzar com a Invoice/Fatura correspondente para obter gorjetas adicionais, taxas e impostos
                if (accJob.InvoiceID) {
                    const inv = invoiceMap[accJob.InvoiceID];
                    if (inv) {
                        if (inv.PaymentStatus && inv.PaymentStatus.toString().trim().toUpperCase() === 'PAID') {
                            rawStatus = 'PAID';
                        }
                        if (inv.PaymentMethod && !accJob.PaymentMethod) {
                            rawPaidBy = inv.PaymentMethod;
                        }
                        if (inv.PaymentDate && !paymentDate) {
                            paymentDate = inv.PaymentDate.split('T')[0];
                        }
                        if (inv.TipAmount && tip === 0) {
                            tip = parseFloat(inv.TipAmount || 0);
                        }
                        if (inv.TaxAmount) {
                            tax = parseFloat(inv.TaxAmount || 0);
                        }
                        if (inv.ConvenienceFeeAmount) {
                            fee = parseFloat(inv.ConvenienceFeeAmount || 0);
                        }
                    }
                }
            }

            // Normalizar status final
            let status = 'PAID';
            if (rawStatus === 'UNPAID' || rawStatus === 'DUE' || rawStatus === 'PENDING' || rawStatus === 'NOTPAID') {
                status = 'DUE';
            } else if (rawStatus === 'PLANNED' || rawStatus === 'SCHEDULED' || rawStatus === 'ACTIVE') {
                status = 'PLANNED';
            } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELADO') {
                status = 'CANCELLED';
            }

            // Normalizar forma de pagamento
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

            // Normalizar data (YYYY-MM-DD)
            let formattedDate = (job.JobDate || '').toString().trim();
            if (formattedDate.includes('T')) formattedDate = formattedDate.split('T')[0];
            if (formattedDate.includes(' ')) formattedDate = formattedDate.split(' ')[0];

            // Montar registro completo do Nucleus com dados integrados
            const record = {
                date: formattedDate,
                trans_type: "Cleaning",
                client: clientName,
                description: `${job.Frequency || 'OneTime'} (${job.JobTimeFrom || ''} - ${job.JobTimeTo || ''})`,
                state: address.State || 'NJ',
                status: status,
                subtotal: charge,
                tax: tax,
                tip: tip,
                fee: fee,
                total: charge + tip + tax + fee,
                paid_by: paidBy,
                invoice_num: invoiceNum,
                notes: `Fatura: ${invoiceNum}. Categoria: ${job.Frequency || ''}. Endereço: ${address.Street || ''}, ${address.City || ''}`
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
