/**
 * Nucleus Financial Control - Nucleus IA Engine & Interface
 * Assistente Inteligente Nativo da Plataforma Nucleus Cleaning Services
 */

class NucleusIAEngine {
    constructor() {
        this.storageKeyHistory = 'nucleus_ia_history_v3';
        this.storageKeyPrefs = 'nucleus_ia_prefs_v3';
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
        console.log('🤖 Nucleus IA inicializado com sucesso.');
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
                        content: 'Olá! Eu sou o **Nucleus IA**.\n\nSou o assistente inteligente da Nucleus Cleaning Services.\n\nPosso analisar seu faturamento, despesas, equipes, clientes, indicadores, relatórios e responder perguntas utilizando os dados reais da sua empresa.\n\nComo posso ajudar você hoje?',
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
                content: 'Nova conversa iniciada! Como posso te ajudar a analisar os indicadores da sua empresa agora?',
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
    // 2. CONTEXTO AUTOMÁTICO EM TEMPO REAL
    // =========================================================================

    buildCurrentContext() {
        if (!window.app) return 'Contexto da aplicação indisponível.';

        const app = window.app;
        const currentTab = app.activeTab || 'overview';
        const ovMode = app.overviewPeriodMode || 'daily';
        const selDate = app.overviewSelectedDate || new Date().toISOString().split('T')[0];
        const selMonth = app.overviewSelectedMonth || selDate.substring(0, 7);

        let allRecords = [];
        if (typeof app.getAllRecords === 'function') {
            allRecords = app.getAllRecords();
        }

        let filteredRecords = [];
        let expTotal = 0;
        const DESPESAS_MONTHLY = 31457.28;

        if (ovMode === 'daily') {
            filteredRecords = allRecords.filter(r => r.date === selDate);
            expTotal = DESPESAS_MONTHLY / 30;
        } else if (ovMode === 'weekly') {
            const selDateObj = new Date(selDate);
            const dayOfWeek = selDateObj.getDay();
            const firstDayOfWeek = new Date(selDateObj);
            firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

            const startStr = firstDayOfWeek.toISOString().split('T')[0];
            const endStr = lastDayOfWeek.toISOString().split('T')[0];

            filteredRecords = allRecords.filter(r => r.date >= startStr && r.date <= endStr);
            expTotal = (DESPESAS_MONTHLY / 30) * 7;
        } else if (ovMode === 'monthly') {
            filteredRecords = allRecords.filter(r => r.date && r.date.startsWith(selMonth));
            expTotal = DESPESAS_MONTHLY;
        } else {
            filteredRecords = allRecords;
            expTotal = DESPESAS_MONTHLY * 12;
        }

        const totals = app.calculateTotals ? app.calculateTotals(filteredRecords) : { subtotal: 0, tip: 0, total: 0, count: 0, ticketMedio: 0, tipPercent: 0 };
        const grossRevenue = totals.total;
        const netProfit = grossRevenue - expTotal;
        const marginPct = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100) : 0;

        const teamBreakdown = {};
        filteredRecords.forEach(r => {
            const t = r.team || 'Não Categorizado';
            if (!teamBreakdown[t]) teamBreakdown[t] = { total: 0, count: 0, tip: 0 };
            teamBreakdown[t].total += (r.total || 0);
            teamBreakdown[t].count += 1;
            teamBreakdown[t].tip += (r.tip || 0);
        });

        let teamSummaryStr = '';
        for (const [tName, tStats] of Object.entries(teamBreakdown)) {
            const ticket = tStats.count > 0 ? (tStats.total / tStats.count) : 0;
            teamSummaryStr += `- ${tName}: $${tStats.total.toFixed(2)} (${tStats.count} agendamentos, Ticket Médio: $${ticket.toFixed(2)}, Tips: $${tStats.tip.toFixed(2)})\n`;
        }

        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        return `
[ESTADO ATUAL DO DASHBOARD DA APLICAÇÃO]:
- Aba Ativa na Interface: "${currentTab}"
- Modo de Período Selecionado na Visão Geral: "${ovMode.toUpperCase()}"
- Data Selecionada: "${selDate}" | Mês Selecionado: "${selMonth}"
- Tema Visual Atual: "${theme.toUpperCase()}"

[KPIs E MÉTRICAS FINANCEIRAS DO PERÍODO SELECIONADO]:
- Faturamento Bruto (Total Revenue): $${grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Subtotal dos Serviços: $${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Gorjetas (Tips): $${totals.tip.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totals.tipPercent.toFixed(1)}% do subtotal)
- Número de Limpezas / Jobs Concluídos: ${totals.count}
- Ticket Médio por Trabalho: $${totals.ticketMedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Despesas Pro-rata Estimadas no Período: $${expTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Lucro Líquido Estimado: $${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Margem Líquida (%): ${marginPct.toFixed(2)}%

[RESUMO DO DESEMPENHO DAS EQUIPES NO PERÍODO]:
${teamSummaryStr || 'Nenhuma transação de equipe registrada para este período específico.'}

[ESTRUTURA DE CUSTOS PADRÃO MENSAL]:
- Payroll (85.96%): $27.040,00/mês
- Frota (9.53%): $2.999,00/mês (3 veículos, seguros e gasolina)
- Marketing (3.18%): $1.000,00/mês (Thumbtack, Ads, ROAS ~38.8x)
- Tech & Softwares (1.86%): $586,28/mês (CRM Maidpad, licenças, telefonia)
- Operações (1.79%): $562,00/mês (Insumos, EPIs, fardamento)
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
                    <button class="copilot-chip" data-prompt="📊 Como está meu faturamento?">
                        📊 Como está meu faturamento?
                    </button>
                    <button class="copilot-chip" data-prompt="💰 Onde estou gastando mais?">
                        💰 Onde estou gastando mais?
                    </button>
                    <button class="copilot-chip" data-prompt="👥 Qual equipe teve melhor desempenho?">
                        👥 Desempenho das Equipes
                    </button>
                    <button class="copilot-chip" data-prompt="📈 Analise minha margem de lucro.">
                        📈 Margem de Lucro
                    </button>
                    <button class="copilot-chip" data-prompt="⭐ Quem são meus clientes VIP?">
                        ⭐ Clientes VIP
                    </button>
                    <button class="copilot-chip" data-prompt="📋 Resuma este período.">
                        📋 Resumo do Período
                    </button>
                    <button class="copilot-chip" data-prompt="🚀 Como posso aumentar meu lucro?">
                        🚀 Como aumentar o lucro
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
        const isOverviewTab = this.activeTab === 'overview' || this.activeTab === 'visao-geral';

        if (isOverviewTab && !isLoginTab) {
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
            // 3. Monta Contexto Atual da Aplicação
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

        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        escaped = escaped.replace(/```([\s\S]*?)```/g, function(match, code) {
            return `<pre class="copilot-code-block"><code>${code.trim()}</code></pre>`;
        });

        escaped = escaped.replace(/`([^`]+)`/g, '<code class="copilot-inline-code">$1</code>');

        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        const lines = escaped.split('\n');
        let inTable = false;
        let tableHtml = '';
        let processedLines = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableHtml = '<div class="copilot-table-wrapper"><table class="copilot-table">';
                }

                if (trimmed.includes('---')) return;

                const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
                tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
            } else {
                if (inTable) {
                    inTable = false;
                    tableHtml += '</table></div>';
                    processedLines.push(tableHtml);
                    tableHtml = '';
                }
                processedLines.push(line);
            }
        });

        if (inTable) {
            tableHtml += '</table></div>';
            processedLines.push(tableHtml);
        }

        escaped = processedLines.join('\n');

        escaped = escaped.replace(/^- (.*)$/gim, '<li>$1</li>');
        escaped = escaped.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

        escaped = escaped.replace(/\n\n/g, '<br><br>');
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
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
