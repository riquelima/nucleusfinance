/**
 * Nucleus Financial Control - Nucleus IA Engine & Interface
 * Assistente Inteligente Nativo da Plataforma Nucleus Cleaning Services
 */

class NucleusIAEngine {
    constructor() {
        this.storageKeyHistory = 'nucleus_ia_history_v4';
        this.storageKeyPrefs = 'nucleus_ia_prefs_v4';
        this.isOpen = false;
        this.isThinking = false;
        this.scrollTimer = null;
        this.messages = [];
        this.activeTab = 'overview';

        // Direct Subscription Key for MiniMax API (Internal details not exposed to UI)
        this.minimaxApiKey = 'sk-cp-meaN0PHZdGi3-5gZffia9b6PyDIh27vyk54LwG6gw965dFLWoIHowFo19rTqoHdbxhaQezJlMMBgTEYhNni51sJnMWCcPHIKtCg4GRY-pGMmrXarNIxxGQA';

        // Bind methods
        this.handleScroll = this.handleScroll.bind(this);
    }

    init() {
        if (this.initialized) return;

        this.loadHistory();
        this.createDOM();
        this.bindEvents();
        this.updateVisibility(window.app ? window.app.activeTab : 'overview');
        this.initialized = true;
        console.log('🤖 Nucleus IA inicializado com consulta direta à base completa da planilha Google Sheets.');
    }

    // =========================================================================
    // 1. MEMÓRIA PERSISTENTE & STORAGE
    // =========================================================================

    loadHistory() {
        try {
            const raw = localStorage.getItem(this.storageKeyHistory);
            if (raw) {
                this.messages = JSON.parse(raw);
            } else {
                this.messages = [
                    {
                        role: 'assistant',
                        content: 'Olá! Eu sou o **Nucleus IA**.\n\nSou o assistente inteligente da Nucleus Cleaning Services.\n\nTenho acesso completo à base de dados da sua planilha no Google Sheets e também aos **dados em tempo real da API do MaidPad** (agendamentos futuros, clientes, e-mails, telefones, endereços e equipes designadas).\n\nComo posso ajudar você hoje?',
                        timestamp: new Date().toISOString()
                    }
                ];
                this.saveHistory();
            }
        } catch (e) {
            console.warn('Erro ao carregar histórico da memória do Nucleus IA:', e);
            this.messages = [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem(this.storageKeyHistory, JSON.stringify(this.messages));
        } catch (e) {
            console.error('Erro ao salvar histórico do Nucleus IA:', e);
        }
    }

    clearCurrentConversation() {
        this.messages = [
            {
                role: 'assistant',
                content: 'Nova conversa iniciada! Como posso te ajudar a analisar os dados da sua planilha agora?',
                timestamp: new Date().toISOString()
            }
        ];
        this.saveHistory();
        this.renderMessages();
        if (window.app && window.app.showToast) {
            window.app.showToast('Conversa com o Nucleus IA renovada.');
        }
    }

    clearAllMemory() {
        if (confirm('Deseja realmente apagar toda a memória persistente do Nucleus IA? Todo o histórico salvo será removido.')) {
            localStorage.removeItem(this.storageKeyHistory);
            localStorage.removeItem(this.storageKeyPrefs);
            this.messages = [
                {
                    role: 'assistant',
                    content: 'Memória limpa com sucesso. Estou pronto para iniciar uma nova análise financeira com você!',
                    timestamp: new Date().toISOString()
                }
            ];
            this.saveHistory();
            this.renderMessages();
            if (window.app && window.app.showToast) {
                window.app.showToast('Memória do Nucleus IA limpa com sucesso.');
            }
        }
    }

    exportHistory() {
        try {
            const dataStr = JSON.stringify(this.messages, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nucleus-ia-historico-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (window.app && window.app.showToast) {
                window.app.showToast('Histórico exportado com sucesso.');
            }
        } catch (e) {
            alert('Falha ao exportar histórico: ' + e.message);
        }
    }

    importHistory(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (Array.isArray(parsed)) {
                    this.messages = parsed;
                    this.saveHistory();
                    this.renderMessages();
                    if (window.app && window.app.showToast) {
                        window.app.showToast('Histórico importado com sucesso!');
                    }
                } else {
                    alert('Formato de arquivo inválido.');
                }
            } catch (err) {
                alert('Erro ao importar arquivo JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // =========================================================================
    // 2. CONTEXTO AUTOMÁTICO COMPLETO DA PLANILHA GOOGLE SHEETS
    // =========================================================================

    buildCurrentContext() {
        if (!window.app) return 'Contexto da aplicação indisponível.';

        const app = window.app;
        const todayStr = window.getUSDateString();
        const currentMonthStr = todayStr.substring(0, 7);
        const manualExpenses = app.manualExpenses || [];

        // Obter TODOS os registros da base
        let allRecords = [];
        if (typeof app.getAllRecords === 'function') {
            allRecords = app.getAllRecords();
        }

        // 1. TOTAIS CONSOLIDADOS GLOBAIS DA PLANILHA (BASE COMPLETA)
        const globalTotals = app.calculateTotals ? app.calculateTotals(allRecords) : { subtotal: 0, tip: 0, total: 0, count: 0, ticketMedio: 0, tipPercent: 0 };
        const globalGrossRevenue = globalTotals.total;
        const DESPESAS_ANNUAL = 377487.36;
        const DESPESAS_MONTHLY = 31457.28;
        
        // Calcula despesas anuais dinamicamente (Sistema + Manuais, computando overrides)
        const globalExpensesTotal = app.calculateExpensesForRange ? app.calculateExpensesForRange('2026-01-01', '2026-12-31') : (DESPESAS_ANNUAL + manualExpenses.reduce((acc, e) => acc + (e.value || 0), 0));
        const globalNetProfit = globalGrossRevenue - globalExpensesTotal;
        const globalMarginPct = globalGrossRevenue > 0 ? ((globalNetProfit / globalGrossRevenue) * 100) : 0;

        // 2. DESEMPENHO ACUMULADO POR EQUIPE EM TODA A BASE
        const teamBreakdown = {};
        allRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!teamBreakdown[t]) teamBreakdown[t] = { total: 0, count: 0, tip: 0, subtotal: 0 };
            teamBreakdown[t].total += (r.total || 0);
            teamBreakdown[t].subtotal += (r.subtotal || 0);
            teamBreakdown[t].count += 1;
            teamBreakdown[t].tip += (r.tip || 0);
        });

        let teamGlobalSummary = '';
        for (const [tName, tStats] of Object.entries(teamBreakdown)) {
            const ticket = tStats.count > 0 ? (tStats.total / tStats.count) : 0;
            const tipPct = tStats.subtotal > 0 ? ((tStats.tip / tStats.subtotal) * 100) : 0;
            teamGlobalSummary += `- ${tName}: Faturamento $${tStats.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Jobs: ${tStats.count} | Ticket Médio: $${ticket.toFixed(2)} | Gorjetas (Tips): $${tStats.tip.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${tipPct.toFixed(1)}%)\n`;
        }

        // 3. CÁLCULO DE DATAS CHAVES (PRECISÃO MATEMÁTICA ABSOLUTA PARA A IA)
        
        // --- HOJE ---
        const hojeRecords = allRecords.filter(r => r.date === todayStr);
        const hojeTotals = app.calculateTotals ? app.calculateTotals(hojeRecords) : { total: 0, count: 0 };
        const hojeTeamMap = {};
        hojeRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!hojeTeamMap[t]) hojeTeamMap[t] = { total: 0, count: 0 };
            hojeTeamMap[t].total += (r.total || 0);
            hojeTeamMap[t].count += 1;
        });
        let hojeTeamSummary = '';
        for (const [tName, tStats] of Object.entries(hojeTeamMap)) {
            hojeTeamSummary += `  * ${tName}: Faturamento $${tStats.total.toLocaleString('en-US', {minimumFractionDigits: 2})} | ${tStats.count} serviços\n`;
        }

        // --- AMANHÃ ---
        const tomorrowObj = new Date();
        tomorrowObj.setHours(tomorrowObj.getHours() - 1 + 24); // fuso EUA amanhã
        const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
        const amanhaRecords = allRecords.filter(r => r.date === tomorrowStr);
        const amanhaTotals = app.calculateTotals ? app.calculateTotals(amanhaRecords) : { total: 0, count: 0 };
        const amanhaTeamMap = {};
        amanhaRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!amanhaTeamMap[t]) amanhaTeamMap[t] = { total: 0, count: 0 };
            amanhaTeamMap[t].total += (r.total || 0);
            amanhaTeamMap[t].count += 1;
        });
        let amanhaTeamSummary = '';
        for (const [tName, tStats] of Object.entries(amanhaTeamMap)) {
            amanhaTeamSummary += `  * ${tName}: Faturamento $${tStats.total.toLocaleString('en-US', {minimumFractionDigits: 2})} | ${tStats.count} serviços\n`;
        }

        // --- SEMANA ATUAL ---
        const todayObj = new Date();
        todayObj.setHours(todayObj.getHours() - 1);
        const dayOfWeek = todayObj.getDay();
        const firstDayOfWeek = new Date(todayObj);
        firstDayOfWeek.setDate(todayObj.getDate() - dayOfWeek);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        const startStr = firstDayOfWeek.toISOString().split('T')[0];
        const endStr = lastDayOfWeek.toISOString().split('T')[0];
        const semanaRecords = allRecords.filter(r => r.date >= startStr && r.date <= endStr);
        const semanaTotals = app.calculateTotals ? app.calculateTotals(semanaRecords) : { total: 0, count: 0 };
        const semanaTeamMap = {};
        semanaRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!semanaTeamMap[t]) semanaTeamMap[t] = { total: 0, count: 0 };
            semanaTeamMap[t].total += (r.total || 0);
            semanaTeamMap[t].count += 1;
        });
        let semanaTeamSummary = '';
        for (const [tName, tStats] of Object.entries(semanaTeamMap)) {
            semanaTeamSummary += `  * ${tName}: Faturamento $${tStats.total.toLocaleString('en-US', {minimumFractionDigits: 2})} | ${tStats.count} serviços\n`;
        }

        // --- MÊS ATUAL ---
        const mesRecords = allRecords.filter(r => r.date && r.date.startsWith(currentMonthStr));
        const mesTotals = app.calculateTotals ? app.calculateTotals(mesRecords) : { total: 0, count: 0 };
        const mesTeamMap = {};
        mesRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!mesTeamMap[t]) mesTeamMap[t] = { total: 0, count: 0 };
            mesTeamMap[t].total += (r.total || 0);
            mesTeamMap[t].count += 1;
        });
        let mesTeamSummary = '';
        for (const [tName, tStats] of Object.entries(mesTeamMap)) {
            mesTeamSummary += `  * ${tName}: Faturamento $${tStats.total.toLocaleString('en-US', {minimumFractionDigits: 2})} | ${tStats.count} serviços\n`;
        }

        // 4. EVOLUÇÃO MENSAL ACUMULADA
        const monthlyMap = {};
        allRecords.forEach(r => {
            if (r.date && r.date.length >= 7) {
                const m = r.date.substring(0, 7);
                if (!monthlyMap[m]) monthlyMap[m] = { total: 0, count: 0, tip: 0 };
                monthlyMap[m].total += (r.total || 0);
                monthlyMap[m].count += 1;
                monthlyMap[m].tip += (r.tip || 0);
            }
        });
        let monthlySummaryStr = '';
        const sortedMonths = Object.keys(monthlyMap).sort();
        sortedMonths.forEach(m => {
            const mData = monthlyMap[m];
            const mExpenses = app.calculateExpensesForPeriod ? app.calculateExpensesForPeriod('monthly', m + '-01', m) : (DESPESAS_MONTHLY + (manualExpenses.filter(e => e.date && e.date.startsWith(m) && !(e.id && e.id.startsWith('SYS-'))).reduce((acc, e) => acc + (e.value || 0), 0)));
            const mProfit = mData.total - mExpenses;
            const mMargin = mData.total > 0 ? ((mProfit / mData.total) * 100) : 0;
            monthlySummaryStr += `- Mês ${m}: Faturamento $${mData.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${mData.count} jobs) | Despesas Operacionais: $${mExpenses.toLocaleString('en-US', {minimumFractionDigits: 2})} | Lucro Líquido: $${mProfit.toLocaleString('en-US', {minimumFractionDigits: 2})} (${mMargin.toFixed(1)}%)\n`;
        });

        // 5. TOP CLIENTES VIP
        const clientsVolumeMap = {};
        allRecords.forEach(r => {
            const c = r.client || 'Outros';
            if (!clientsVolumeMap[c]) clientsVolumeMap[c] = { total: 0, count: 0 };
            clientsVolumeMap[c].total += (r.total || 0);
            clientsVolumeMap[c].count += 1;
        });
        const topClients = Object.entries(clientsVolumeMap)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([cName, cStats], idx) => `${idx + 1}. ${cName}: $${cStats.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${cStats.count} limpezas)`)
            .join('\n');

        // Formatação dos dados em tempo real da API do MaidPad
        let maidpadClientsStr = '';
        if (app.maidpadClients && app.maidpadClients.length > 0) {
            app.maidpadClients.forEach(c => {
                const addrs = c.Addresses && c.Addresses.length > 0
                    ? c.Addresses.map(a => `${a.Street}, ${a.City}, ${a.State} (Valor: $${a.Charge}, Equipe Padrão: TIME ${a.DefaultTeam || 'N/A'})`).join(' | ')
                    : 'Sem Endereço';
                maidpadClientsStr += `- Cliente ID #${c.ID}: **${c.FirstName} ${c.LastName}** | Ref: ${c.Reference || 'Nenhuma'} | E-mail: ${c.Email || 'N/A'} | Tel: ${c.Phone1 || 'N/A'} | Freq. Pref: ${c.PreferredFrequency || 'N/A'} | Dia Pref: ${c.PreferredDayOfWeek || 'N/A'} | Endereço(s): [${addrs}]\n`;
            });
        } else {
            maidpadClientsStr = 'Nenhum cliente carregado via API do MaidPad ainda.';
        }

        let maidpadJobsStr = '';
        if (app.maidpadJobs && app.maidpadJobs.length > 0) {
            const clientMap = {};
            if (app.maidpadClients) {
                app.maidpadClients.forEach(c => {
                    clientMap[c.ID] = `${c.FirstName} ${c.LastName}`.trim();
                });
            }
            app.maidpadJobs.forEach(j => {
                const cName = clientMap[j.ClientID] || `Cliente #${j.ClientID}`;
                maidpadJobsStr += `- Serviço ID #${j.ID}: Cliente: ${cName} (ID: ${j.ClientID}) | Data: ${j.JobDate} | Horário: ${j.JobTimeFrom} - ${j.JobTimeTo} | Freq: ${j.Frequency} | Valor: $${j.Charge} | Cobrança: ${j.ChargeBy}\n`;
            });
        } else {
            maidpadJobsStr = 'Nenhum agendamento futuro carregado via API do MaidPad ainda.';
        }

        // Calcular despesas manuais para os períodos chaves
        const hojeManualExp = manualExpenses.filter(e => e.date === todayStr);
        const hojeManualTotal = hojeManualExp.reduce((acc, e) => acc + (e.value || 0), 0);
        let hojeManualSummary = '';
        hojeManualExp.forEach(e => {
            hojeManualSummary += `  * [Manual] Categoria: ${e.category} | Centro: ${e.centro} | Descrição: ${e.desc} | Valor: $${e.value.toFixed(2)}\n`;
        });

        const amanhaManualExp = manualExpenses.filter(e => e.date === tomorrowStr);
        const amanhaManualTotal = amanhaManualExp.reduce((acc, e) => acc + (e.value || 0), 0);
        let amanhaManualSummary = '';
        amanhaManualExp.forEach(e => {
            amanhaManualSummary += `  * [Manual] Categoria: ${e.category} | Centro: ${e.centro} | Descrição: ${e.desc} | Valor: $${e.value.toFixed(2)}\n`;
        });

        const semanaManualExp = manualExpenses.filter(e => e.date >= startStr && e.date <= endStr);
        const semanaManualTotal = semanaManualExp.reduce((acc, e) => acc + (e.value || 0), 0);
        let semanaManualSummary = '';
        semanaManualExp.forEach(e => {
            semanaManualSummary += `  * [Manual] Data: ${e.date} | Categoria: ${e.category} | Centro: ${e.centro} | Descrição: ${e.desc} | Valor: $${e.value.toFixed(2)}\n`;
        });

        const mesManualExp = manualExpenses.filter(e => e.date && e.date.startsWith(currentMonthStr));
        const mesManualTotal = mesManualExp.reduce((acc, e) => acc + (e.value || 0), 0);
        let mesManualSummary = '';
        mesManualExp.forEach(e => {
            mesManualSummary += `  * [Manual] Data: ${e.date} | Categoria: ${e.category} | Centro: ${e.centro} | Descrição: ${e.desc} | Valor: $${e.value.toFixed(2)}\n`;
        });

        return `
[DADOS ATUAIS PRÉ-CALCULADOS (HOJE, AMANHÃ, SEMANA E MÊS)]:
- Dia de Hoje nos EUA: "${todayStr}"
- Faturamento Consolidado de Hoje: $${hojeTotals.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${hojeTotals.count} limpezas)
- Faturamento por Equipe Hoje:
${hojeTeamSummary || '  * Sem faturamento nas equipes Hoje.'}

- Dia de Amanhã nos EUA: "${tomorrowStr}"
- Faturamento Consolidado de Amanhã: $${amanhaTotals.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${amanhaTotals.count} limpezas)
- Faturamento por Equipe Amanhã:
${amanhaTeamSummary || '  * Sem faturamento nas equipes Amanhã.'}

- Semana Atual (${startStr} até ${endStr}):
- Faturamento Consolidado da Semana: $${semanaTotals.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${semanaTotals.count} limpezas)
- Faturamento por Equipe na Semana:
${semanaTeamSummary || '  * Sem faturamento nas equipes nesta semana.'}

- Mês Atual (${currentMonthStr}):
- Faturamento Consolidado do Mês: $${mesTotals.total.toLocaleString('en-US', {minimumFractionDigits: 2})} (${mesTotals.count} limpezas)
- Faturamento por Equipe no Mês:
${mesTeamSummary || '  * Sem faturamento nas equipes neste mês.'}

[DESPESAS OPERACIONAIS MANUAIS REGISTRADAS PELO USUÁRIO]:
- Total de Despesas Manuais Cadastradas Hoje: $${hojeManualTotal.toFixed(2)}
${hojeManualSummary || '  * Nenhuma despesa manual cadastrada Hoje.'}

- Total de Despesas Manuais Cadastradas Amanhã: $${amanhaManualTotal.toFixed(2)}
${amanhaManualSummary || '  * Nenhuma despesa manual cadastrada Amanhã.'}

- Total de Despesas Manuais na Semana Atual: $${semanaManualTotal.toFixed(2)}
${semanaManualSummary || '  * Nenhuma despesa manual cadastrada nesta semana.'}

- Total de Despesas Manuais no Mês Atual: $${mesManualTotal.toFixed(2)}
${mesManualSummary || '  * Nenhuma despesa manual cadastrada neste mês.'}

- Histórico de Todas as Despesas Cadastradas (Manuais e Overrides de Sistema):
${manualExpenses.length > 0 ? manualExpenses.map(e => `- ID: ${e.id} | Data: ${e.date} | Categoria: ${e.category} | Centro: ${e.centro} | Desc: ${e.desc} | Valor: $${e.value.toFixed(2)} | Pgto: ${e.paid_by} | Status: ${e.status} | Criado: ${e.created_at} | Tipo: ${e.id.startsWith('SYS-') ? 'Sobrescrita de Sistema' : 'Manual'}`).join('\n') : 'Nenhuma despesa gravada na base.'}

[BANCO DE DADOS COMPLETO DO SISTEMA (GOOGLE SHEETS & MAIDPAD API)]:
- Faturamento Bruto Total Histórico: $${globalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Subtotal Acumulado dos Serviços: $${globalTotals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Gorjetas Totais (Tips Acumuladas): $${globalTotals.tip.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${globalTotals.tipPercent.toFixed(1)}% do subtotal)
- Número Total de Limpezas: ${globalTotals.count}
- Ticket Médio Geral: $${globalTotals.ticketMedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Despesas Operacionais Totais Anuais (Computando Overrides de Sistema & Manuais): $${globalExpensesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Lucro Líquido Global: $${globalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Margem Líquida Geral da Empresa: ${globalMarginPct.toFixed(2)}%

[CONSOLIDAÇÃO HISTÓRICA POR EQUIPE]:
${teamGlobalSummary}

[EVOLUÇÃO MENSAL]:
${monthlySummaryStr || 'Nenhum histórico mensal disponível.'}

[RANKING DOS TOP 5 CLIENTES VIP]:
${topClients || 'Nenhum cliente registrado.'}

[ESTRUTURA DE CENTRO DE CUSTOS MENSAL]:
- Payroll (85.96%): $27.040,00/mês
- Frota (9.53%): $2.999,00/mês (3 veículos, seguros comerciais e combustível)
- Marketing (3.18%): $1.000,00/mês (Thumbtack, Ads, ROAS ~38.8x)
- Tech & Softwares (1.86%): $586,28/mês (CRM Maidpad, licenças, telefonia)
- Operações (1.79%): $562,00/mês (Insumos, EPIs, fardamento)

[DADOS EM TEMPO REAL DA API DO MAIDPAD (INTEGRAÇÃO ATIVA)]:
### Clientes Cadastrados no MaidPad:
${maidpadClientsStr}

### Agendamentos Futuros no MaidPad:
${maidpadJobsStr}
`;
    }

    // =========================================================================
    // 3. CRIAÇÃO DE ELEMENTOS DOM (FAB & MODAL)
    // =========================================================================

    createDOM() {
        if (document.getElementById('copilotFab')) return;

        // Container Flutuante FAB
        const fabHtml = `
            <button id="copilotFab" class="copilot-fab copilot-fab-enter" title="Abrir Nucleus IA" aria-label="Abrir Nucleus IA">
                <div class="copilot-fab-glow"></div>
                <div class="copilot-fab-icon">
                    <img src="nucleusLogoTransparente.png" alt="Nucleus Logo" class="copilot-fab-logo-img" style="width: 22px; height: 22px; max-width: 22px; max-height: 22px; object-fit: contain;">
                </div>
                <span class="copilot-fab-badge">Nucleus IA</span>
            </button>
        `;

        // Modal / Bottom Sheet Chat Interface
        const modalHtml = `
            <div id="copilotModal" class="copilot-modal" style="display: none;" role="dialog" aria-modal="true" aria-label="Nucleus IA">
                <!-- Resizers para Desktop -->
                <div id="copilotResizerLeft" class="copilot-resizer left"></div>
                <div id="copilotResizerTop" class="copilot-resizer top"></div>
                <div id="copilotResizerCorner" class="copilot-resizer-corner"></div>
                <!-- Header Chat -->
                <div class="copilot-header">
                    <div class="copilot-brand-info">
                        <div class="copilot-avatar">
                            <img src="nucleusLogoTransparente.png" alt="Nucleus Logo" class="copilot-avatar-img" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        <div class="copilot-title-group">
                            <div class="copilot-title">
                                Nucleus IA
                                <span class="copilot-model-pill">Nativo</span>
                            </div>
                            <div class="copilot-status">
                                <span class="copilot-status-dot"></span> Especialista em Inteligência Financeira
                            </div>
                        </div>
                    </div>

                    <div class="copilot-header-actions">
                        <div class="copilot-dropdown-wrapper">
                            <button id="copilotMenuBtn" class="copilot-btn-icon" title="Opções do Nucleus IA">
                                <i data-lucide="more-vertical"></i>
                            </button>
                            <div id="copilotDropdownMenu" class="copilot-dropdown-menu" style="display: none;">
                                <button id="btnCopilotNewChat" class="copilot-dropdown-item">
                                    <i data-lucide="plus-circle"></i> Nova Conversa
                                </button>
                                <button id="btnCopilotExport" class="copilot-dropdown-item">
                                    <i data-lucide="download"></i> Exportar Histórico
                                </button>
                                <button id="btnCopilotImportTrigger" class="copilot-dropdown-item">
                                    <i data-lucide="upload"></i> Importar Histórico
                                </button>
                                <div class="copilot-dropdown-divider"></div>
                                <button id="btnCopilotClearMemory" class="copilot-dropdown-item danger">
                                    <i data-lucide="trash-2"></i> Limpar Memória do Nucleus IA
                                </button>
                            </div>
                        </div>

                        <button id="copilotCloseBtn" class="copilot-btn-icon" title="Fechar">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </div>

                <!-- Input File Oculto para Importação -->
                <input type="file" id="copilotFileInput" accept=".json" style="display: none;">

                <!-- Prompt Suggestions Chips -->
                <div class="copilot-suggestions-bar">
                    <button class="copilot-chip" data-prompt="📊 Como está meu faturamento total na planilha?">
                        📊 Faturamento Geral
                    </button>
                    <button class="copilot-chip" data-prompt="💰 Onde estou gastando mais dinheiro?">
                        💰 Gastos & Despesas
                    </button>
                    <button class="copilot-chip" data-prompt="👥 Qual equipe teve o melhor desempenho acumulado?">
                        👥 Desempenho das Equipes
                    </button>
                    <button class="copilot-chip" data-prompt="📈 Analise minha margem de lucro acumulada.">
                        📈 Margem de Lucro
                    </button>
                    <button class="copilot-chip" data-prompt="⭐ Quem são meus maiores clientes VIP?">
                        ⭐ Clientes VIP
                    </button>
                    <button class="copilot-chip" data-prompt="📋 Resuma os dados consolidados da planilha.">
                        📋 Resumo da Planilha
                    </button>
                    <button class="copilot-chip" data-prompt="🚀 Como posso aumentar meu lucro no geral?">
                        🚀 Dicas de Lucro
                    </button>
                </div>

                <!-- Body Messages Container -->
                <div id="copilotMessages" class="copilot-messages">
                    <!-- Loaded dynamically -->
                </div>

                <!-- Indicator Typing State -->
                <div id="copilotTypingState" class="copilot-typing-container" style="display: none;">
                    <div class="copilot-avatar small">
                        <img src="nucleusLogoTransparente.png" alt="Nucleus Logo" class="copilot-avatar-img" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <div class="copilot-typing-bubble">
                        <span class="copilot-typing-label">Nucleus IA está analisando seus dados...</span>
                        <div class="copilot-typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>

                <!-- Footer Input Area -->
                <div class="copilot-footer">
                    <form id="copilotForm" onsubmit="event.preventDefault(); window.NucleusCopilot && window.NucleusCopilot.handleSubmit();">
                        <div class="copilot-input-wrapper">
                            <textarea 
                                id="copilotInput" 
                                class="copilot-textarea" 
                                placeholder="Converse com o Nucleus IA ou faça uma pergunta sobre seus indicadores..." 
                                rows="1"
                                required
                            ></textarea>
                            <button type="submit" id="copilotSendBtn" class="copilot-send-btn" title="Enviar Pergunta">
                                <i data-lucide="send"></i>
                            </button>
                        </div>
                    </form>
                    <div class="copilot-footer-note">
                        Nucleus IA • Inteligência Financeira em Tempo Real
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', fabHtml + modalHtml);

        if (window.app && typeof window.app.refreshLucideIcons === 'function') {
            window.app.refreshLucideIcons();
        }
    }

    // =========================================================================
    // 4. EVENTOS E CONTROLADORES DE INTERAÇÃO
    // =========================================================================

    bindEvents() {
        const fab = document.getElementById('copilotFab');
        const closeBtn = document.getElementById('copilotCloseBtn');
        const menuBtn = document.getElementById('copilotMenuBtn');
        const dropdown = document.getElementById('copilotDropdownMenu');
        const input = document.getElementById('copilotInput');
        const newChatBtn = document.getElementById('btnCopilotNewChat');
        const clearMemBtn = document.getElementById('btnCopilotClearMemory');
        const exportBtn = document.getElementById('btnCopilotExport');
        const importTrigger = document.getElementById('btnCopilotImportTrigger');
        const fileInput = document.getElementById('copilotFileInput');

        if (fab) {
            fab.addEventListener('click', () => this.toggle());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });

            document.addEventListener('click', (e) => {
                if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.clearCurrentConversation();
            });
        }

        if (clearMemBtn) {
            clearMemBtn.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.clearAllMemory();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.exportHistory();
            });
        }

        if (importTrigger && fileInput) {
            importTrigger.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                fileInput.click();
            });
            fileInput.addEventListener('change', (e) => this.importHistory(e));
        }

        // Chip Prompt Suggestions
        document.addEventListener('click', (e) => {
            const chip = e.target.closest('.copilot-chip');
            if (chip) {
                const promptText = chip.getAttribute('data-prompt');
                if (promptText) {
                    if (input) input.value = promptText;
                    this.handleSubmit();
                }
            }
        });

        // Auto-height textarea
        if (input) {
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSubmit();
                }
            });
        }

        // Scroll listener com debounce para FAB
        window.addEventListener('scroll', this.handleScroll, { passive: true });

        // Redimensionamento bidimensional do modal do Copilot (Desktop)
        const resizerLeft = document.getElementById('copilotResizerLeft');
        const resizerTop = document.getElementById('copilotResizerTop');
        const resizerCorner = document.getElementById('copilotResizerCorner');
        const modal = document.getElementById('copilotModal');

        if (modal) {
            const setupResizer = (resizerEl, direction) => {
                if (!resizerEl) return;

                const handleMouseDownOrTouchStart = (e) => {
                    e.preventDefault();

                    const isTouch = e.type === 'touchstart';
                    const startX = isTouch ? e.touches[0].clientX : e.clientX;
                    const startY = isTouch ? e.touches[0].clientY : e.clientY;
                    
                    const startWidth = modal.getBoundingClientRect().width;
                    const startHeight = modal.getBoundingClientRect().height;

                    modal.classList.add('resizing');
                    document.body.classList.add('resizing-active');

                    // Define o cursor global de acordo com a direção do arrasto
                    if (direction === 'left') {
                        document.body.setAttribute('data-resizing-dir', 'ew');
                    } else if (direction === 'top') {
                        document.body.setAttribute('data-resizing-dir', 'ns');
                    } else if (direction === 'corner') {
                        document.body.setAttribute('data-resizing-dir', 'nwse');
                    }

                    const handleMove = (moveEvent) => {
                        const currentX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX;
                        const currentY = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientY : moveEvent.clientY;

                        // --- REDIMENSIONAR LARGURA (Esquerda ou Canto) ---
                        if (direction === 'left' || direction === 'corner') {
                            const dx = currentX - startX;
                            let newWidth = startWidth - dx;
                            const minWidth = 320;
                            const maxWidth = window.innerWidth - 32; // Limite expandido para dar flexibilidade total
                            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
                            modal.style.width = newWidth + 'px';
                        }

                        // --- REDIMENSIONAR ALTURA (Topo ou Canto) ---
                        if (direction === 'top' || direction === 'corner') {
                            const dy = currentY - startY;
                            let newHeight = startHeight - dy;
                            const minHeight = 350;
                            const maxHeight = window.innerHeight - 100; // Limite expandido
                            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                            modal.style.height = newHeight + 'px';
                        }
                    };

                    const handleEnd = () => {
                        modal.classList.remove('resizing');
                        document.body.classList.remove('resizing-active');
                        document.body.removeAttribute('data-resizing-dir');

                        // Salva as dimensões definidas no localStorage
                        if (direction === 'left' || direction === 'corner') {
                            localStorage.setItem('nucleus_ia_chat_width', modal.style.width);
                        }
                        if (direction === 'top' || direction === 'corner') {
                            localStorage.setItem('nucleus_ia_chat_height', modal.style.height);
                        }

                        if (isTouch) {
                            document.removeEventListener('touchmove', handleMove);
                            document.removeEventListener('touchend', handleEnd);
                        } else {
                            document.removeEventListener('mousemove', handleMove);
                            document.removeEventListener('mouseup', handleEnd);
                        }
                    };

                    if (isTouch) {
                        document.addEventListener('touchmove', handleMove, { passive: false });
                        document.addEventListener('touchend', handleEnd);
                    } else {
                        document.addEventListener('mousemove', handleMove);
                        document.addEventListener('mouseup', handleEnd);
                    }
                };

                resizerEl.addEventListener('mousedown', handleMouseDownOrTouchStart);
                resizerEl.addEventListener('touchstart', handleMouseDownOrTouchStart, { passive: false });
            };

            setupResizer(resizerLeft, 'left');
            setupResizer(resizerTop, 'top');
            setupResizer(resizerCorner, 'corner');
        }
    }

    handleScroll() {
        if (this.activeTab !== 'overview' || this.isOpen) return;

        const fab = document.getElementById('copilotFab');
        if (!fab) return;

        // Oculta enquanto rola
        fab.classList.add('copilot-fab-scrolling');

        if (this.scrollTimer) clearTimeout(this.scrollTimer);

        // Reexibe 400ms após parar o scroll
        this.scrollTimer = setTimeout(() => {
            fab.classList.remove('copilot-fab-scrolling');
        }, 400);
    }

    updateVisibility(tabId) {
        if (window.app && window.app.activeTab) {
            this.activeTab = window.app.activeTab;
        } else if (tabId) {
            this.activeTab = tabId;
        } else {
            this.activeTab = 'overview';
        }

        const fab = document.getElementById('copilotFab');
        if (!fab) return;

        const isLoginTab = this.activeTab === 'login';

        if (!isLoginTab) {
            fab.classList.remove('copilot-fab-hidden');
            fab.classList.add('copilot-fab-enter');
            fab.style.display = 'flex';
        } else {
            fab.classList.remove('copilot-fab-enter');
            fab.classList.add('copilot-fab-hidden');
            if (this.isOpen) {
                this.close();
            }
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        const modal = document.getElementById('copilotModal');
        const fab = document.getElementById('copilotFab');
        if (!modal) return;

        modal.style.display = 'flex';

        // Restaura a largura e altura salvas do chat no localStorage (somente se for Desktop)
        if (window.innerWidth > 768) {
            const savedWidth = localStorage.getItem('nucleus_ia_chat_width');
            if (savedWidth) {
                const parsedWidth = parseInt(savedWidth, 10);
                const maxWidth = window.innerWidth - 32;
                modal.style.width = Math.max(320, Math.min(maxWidth, parsedWidth)) + 'px';
            }
            const savedHeight = localStorage.getItem('nucleus_ia_chat_height');
            if (savedHeight) {
                const parsedHeight = parseInt(savedHeight, 10);
                const maxHeight = window.innerHeight - 100;
                modal.style.height = Math.max(350, Math.min(maxHeight, parsedHeight)) + 'px';
            }
        }

        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        if (fab) fab.classList.add('copilot-fab-active');
        this.isOpen = true;
        this.renderMessages();

        const input = document.getElementById('copilotInput');
        if (input && window.innerWidth > 768) {
            setTimeout(() => input.focus(), 150);
        }
    }

    close() {
        const modal = document.getElementById('copilotModal');
        const fab = document.getElementById('copilotFab');
        if (!modal) return;

        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 250);

        if (fab) fab.classList.remove('copilot-fab-active');
        this.isOpen = false;
    }

    // =========================================================================
    // 5. ENVIO DE MENSAGENS E INTEGRAÇÃO DE INTELIGÊNCIA
    // =========================================================================

    async handleSubmit() {
        if (this.isThinking) return;

        const input = document.getElementById('copilotInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // Limpa campo de entrada
        input.value = '';
        input.style.height = 'auto';

        // 1. Adiciona mensagem do Usuário
        const userMsg = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };
        this.messages.push(userMsg);
        this.saveHistory();
        this.renderMessages();

        // 2. Ativa estado de carregamento
        this.setThinking(true);

        try {
            // 3. Monta Contexto Atual da Aplicação (Base Completa da Planilha)
            const contextStr = this.buildCurrentContext();
            const systemPrompt = (window.NUCLEUS_SYSTEM_PROMPT || '') + '\n\n' + contextStr;

            // 4. Prepara mensagens para envio à inteligência do sistema
            const apiMessages = [
                { role: 'system', content: systemPrompt }
            ];

            const recentHistory = this.messages.slice(-8);
            recentHistory.forEach(m => {
                apiMessages.push({
                    role: m.role,
                    content: m.content
                });
            });

            // 5. Chamada de API para o serviço de inteligência
            let replyText = '';
            const keyToUse = this.minimaxApiKey;

            // Tentativa 1: Endpoint Proxy Serverless
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: apiMessages,
                        apiKey: keyToUse
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        replyText = data.choices[0].message.content;
                    }
                }
            } catch (errProxy) {
                console.warn('Proxy /api/chat não disponível, tentando chamada direta...', errProxy);
            }

            // Tentativa 2: Chamada direta resiliência
            if (!replyText) {
                const directRes = await fetch('https://api.minimaxi.chat/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${keyToUse}`
                    },
                    body: JSON.stringify({
                        model: 'MiniMax-Text-01',
                        messages: apiMessages,
                        temperature: 0.3,
                        top_p: 0.95,
                        max_tokens: 2048
                    })
                });

                if (directRes.ok) {
                    const d = await directRes.json();
                    if (d.choices && d.choices[0] && d.choices[0].message) {
                        replyText = d.choices[0].message.content;
                    }
                } else {
                    const errBody = await directRes.text();
                    console.error('Service Error:', directRes.status, errBody);
                }
            }

            if (!replyText) {
                replyText = 'O Nucleus IA encontrou uma instabilidade temporária ao consultar o serviço de inteligência. Tente novamente em alguns instantes.';
            }

            // 6. Adiciona resposta da IA
            const aiMsg = {
                role: 'assistant',
                content: replyText,
                timestamp: new Date().toISOString()
            };
            this.messages.push(aiMsg);
            this.saveHistory();

        } catch (error) {
            console.error('Erro na chamada do Nucleus IA:', error);
            this.messages.push({
                role: 'assistant',
                content: 'O Nucleus IA encontrou uma instabilidade temporária ao consultar o serviço de inteligência. Tente novamente em alguns instantes.',
                timestamp: new Date().toISOString()
            });
            this.saveHistory();
        } finally {
            this.setThinking(false);
            this.renderMessages();
        }
    }

    setThinking(thinking) {
        this.isThinking = thinking;
        const typingElem = document.getElementById('copilotTypingState');
        const sendBtn = document.getElementById('copilotSendBtn');

        if (typingElem) {
            typingElem.style.display = thinking ? 'flex' : 'none';
        }
        if (sendBtn) {
            sendBtn.disabled = thinking;
            sendBtn.innerHTML = thinking ? '<i data-lucide="loader-2" class="spin"></i>' : '<i data-lucide="send"></i>';
        }
        if (window.app && typeof window.app.refreshLucideIcons === 'function') {
            window.app.refreshLucideIcons();
        }
        this.scrollToBottom();
    }

    // =========================================================================
    // 6. RENDERIZAÇÃO DE MENSAGENS & MARKDOWN PARSER
    // =========================================================================

    renderMessages() {
        const container = document.getElementById('copilotMessages');
        if (!container) return;

        let html = '';
        this.messages.forEach((msg, idx) => {
            const isUser = msg.role === 'user';
            const formattedContent = this.parseMarkdown(msg.content);
            const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            if (isUser) {
                html += `
                    <div class="copilot-msg-row user">
                        <div class="copilot-msg-bubble user">
                            <div class="copilot-msg-text">${formattedContent}</div>
                            <div class="copilot-msg-time">${timeStr}</div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="copilot-msg-row assistant">
                        <div class="copilot-avatar small">
                            <img src="nucleusLogoTransparente.png" alt="Nucleus Logo" class="copilot-avatar-img" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>
                        <div class="copilot-msg-bubble assistant">
                            <div class="copilot-msg-text">${formattedContent}</div>
                            <div class="copilot-msg-actions">
                                <span class="copilot-msg-time">${timeStr}</span>
                                <button class="copilot-copy-btn" onclick="window.NucleusCopilot && window.NucleusCopilot.copyMessage(${idx})" title="Copiar resposta">
                                    <i data-lucide="copy"></i> Copiar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;

        if (window.app && typeof window.app.refreshLucideIcons === 'function') {
            window.app.refreshLucideIcons();
        }

        this.scrollToBottom();
    }

    copyMessage(index) {
        if (this.messages[index] && this.messages[index].content) {
            const text = this.messages[index].content;
            navigator.clipboard.writeText(text).then(() => {
                if (window.app && window.app.showToast) {
                    window.app.showToast('Resposta copiada!');
                } else {
                    alert('Texto copiado!');
                }
            }).catch(err => {
                console.error('Erro ao copiar texto:', err);
            });
        }
    }

    scrollToBottom() {
        const container = document.getElementById('copilotMessages');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }

    parseMarkdown(text) {
        if (!text) return '';

        // 1. Escapar caracteres HTML básicos para evitar injeção
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Extrair blocos de código markdown
        const codeBlocks = [];
        escaped = escaped.replace(/```([\s\S]*?)```/g, function(match, code) {
            const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
            codeBlocks.push(`<pre class="copilot-code-block"><code>${code.trim()}</code></pre>`);
            return placeholder;
        });

        // 3. Processar linha por linha para criar a estrutura HTML
        const lines = escaped.split('\n');
        let htmlResult = [];
        
        let inUl = false;
        let inOl = false;
        let inTable = false;
        let tableHeaderRead = false;

        function closeOpenBlocks() {
            if (inUl) {
                htmlResult.push('</ul>');
                inUl = false;
            }
            if (inOl) {
                htmlResult.push('</ol>');
                inOl = false;
            }
            if (inTable) {
                htmlResult.push('</tbody></table></div>');
                inTable = false;
                tableHeaderRead = false;
            }
        }

        // Função auxiliar para aplicar estilos inline (links, negrito, itálico, code) em uma linha de texto
        function applyInlineStyles(lineText) {
            let processed = lineText;
            
            // Links: [texto](url)
            processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="copilot-link">$1</a>');
            
            // Inline code: `code`
            processed = processed.replace(/`([^`]+)`/g, '<code class="copilot-inline-code">$1</code>');
            
            // Negrito: **text** ou __text__
            processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
            
            // Itálico: *text* ou _text_
            processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
            
            return processed;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Pular separadores de tabela markdown
            if (inTable && trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('---')) {
                continue;
            }

            // --- HEADINGS ---
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                closeOpenBlocks();
                const level = headingMatch[1].length;
                const content = applyInlineStyles(headingMatch[2]);
                htmlResult.push(`<h${level}>${content}</h${level}>`);
                continue;
            }

            // --- LINHA HORIZONTAL ---
            if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
                closeOpenBlocks();
                htmlResult.push('<hr class="copilot-hr">');
                continue;
            }

            // --- TABELAS ---
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                if (inUl || inOl) {
                    closeOpenBlocks();
                }
                if (!inTable) {
                    inTable = true;
                    htmlResult.push('<div class="copilot-table-wrapper"><table class="copilot-table">');
                    htmlResult.push('<thead>');
                }

                const cells = trimmed.slice(1, -1).split('|').map(c => applyInlineStyles(c.trim()));
                
                if (inTable && !tableHeaderRead) {
                    htmlResult.push('<tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr>');
                    htmlResult.push('</thead><tbody>');
                    tableHeaderRead = true;
                } else {
                    htmlResult.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
                }
                continue;
            }

            // --- LISTAS DESORDENADAS ---
            // Suporta asterisco (*), hífen (-), mais (+) ou bullet (•)
            const ulMatch = line.match(/^(\s*)([*+-]|•)\s+(.*)$/);
            if (ulMatch) {
                if (inOl || inTable) {
                    closeOpenBlocks();
                }
                if (!inUl) {
                    htmlResult.push('<ul>');
                    inUl = true;
                }
                const content = applyInlineStyles(ulMatch[3]);
                htmlResult.push(`<li>${content}</li>`);
                continue;
            }

            // --- LISTAS ORDENADAS ---
            const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
            if (olMatch) {
                if (inUl || inTable) {
                    closeOpenBlocks();
                }
                if (!inOl) {
                    htmlResult.push('<ol>');
                    inOl = true;
                }
                const content = applyInlineStyles(olMatch[3]);
                htmlResult.push(`<li>${content}</li>`);
                continue;
            }

            // --- LINHA VAZIA ---
            if (trimmed === '') {
                closeOpenBlocks();
                if (htmlResult.length > 0 && htmlResult[htmlResult.length - 1] !== '<br>') {
                    htmlResult.push('<br>');
                }
                continue;
            }

            // --- LINHA DE TEXTO NORMAL ---
            closeOpenBlocks();
            const content = applyInlineStyles(line);
            
            // Verificar se precisamos de <br> no final para manter quebras simples de parágrafo
            let appendBr = false;
            if (i < lines.length - 1) {
                const nextLine = lines[i + 1].trim();
                const isNextSpecial = nextLine === '' || 
                                     nextLine.match(/^(#{1,6})\s+/) || 
                                     nextLine.startsWith('|') || 
                                     nextLine.match(/^(\s*)([*+-]|•|\d+\.)\s+/);
                if (!isNextSpecial) {
                    appendBr = true;
                }
            }
            
            htmlResult.push(content + (appendBr ? '<br>' : ''));
        }

        // Fechar qualquer bloco ainda aberto no final
        closeOpenBlocks();

        // 4. Juntar as linhas
        let parsed = htmlResult.join('\n');

        // Limpar quebras de linha (<br>) duplicadas adjacentes a elementos de bloco
        parsed = parsed.replace(/(<\/h[1-6]>)\n*<br>/gi, '$1');
        parsed = parsed.replace(/(<\/ul>)\n*<br>/gi, '$1');
        parsed = parsed.replace(/(<\/ol>)\n*<br>/gi, '$1');
        parsed = parsed.replace(/(<\/div>)\n*<br>/gi, '$1'); // div do table-wrapper
        parsed = parsed.replace(/<br>\n*(<h[1-6]>)/gi, '$1');
        parsed = parsed.replace(/<br>\n*(<ul>)/gi, '$1');
        parsed = parsed.replace(/<br>\n*(<ol>)/gi, '$1');
        parsed = parsed.replace(/<br>\n*(<div class="copilot-table-wrapper">)/gi, '$1');

        // 5. Restaurar blocos de código
        codeBlocks.forEach((codeHtml, idx) => {
            parsed = parsed.replace(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, codeHtml);
        });

        return parsed;
    }
}

// Instanciação Global e Compatibilidade
window.NucleusIA = new NucleusIAEngine();
window.NucleusCopilot = window.NucleusIA;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.NucleusIA.init();
    }, 200);
});
