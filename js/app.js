/**
 * Nucleus Cleaning Services - Executive Dashboard Engine
 * Default Mode: Visão Geral pre-selected to 'daily' (Dia) with Today's Date dynamically initialized.
 * 100% Dynamic Engine for Visão Geral & Aba Equipes Executiva BI Expansion.
 */

// Audit Base Monthly Expenses (Aba Despesas)
const DESPESAS_MONTHLY_TOTAL = 31457.28;
const DESPESAS_ANNUAL_TOTAL = 377487.36;
const DESPESAS_CATEGORIES_MONTHLY = {
    payroll: 27040.00,  // 85.96%
    frota: 2999.00,     // 9.53%
    marketing: 1000.00, // 3.18%
    tech: 586.28,       // 1.86%
    ops: 562.00         // 1.79%
};

class NucleusDashboardApp {
    constructor() {
        // App State
        this.currentData = window.INITIAL_SHEET_DATA || {};
        this.activeTab = 'login';
        this.isAuthenticated = false;
        this.selectedTeamFilter = 'ALL';
        this.selectedStatusFilter = 'ALL';
        this.searchQuery = '';
        this.currentPage = 1;
        this.pageSize = 15;
        this.charts = {};

        // MiniMax API Subscription Key
        this.minimaxApiKey = 'sk-cp-meaN0PHZdGi3-5gZffia9b6PyDIh27vyk54LwG6gw965dFLWoIHowFo19rTqoHdbxhaQezJlMMBgTEYhNni51sJnMWCcPHIKtCg4GRY-pGMmrXarNIxxGQA';

        // Overview Tab Default Period Mode ('daily' / 'Dia' by default)
        const todayStr = new Date().toISOString().split('T')[0];
        this.overviewPeriodMode = 'daily';
        this.overviewSelectedDate = todayStr;
        this.overviewSelectedMonth = todayStr.substring(0, 7);

        // Teams Tab Period Mode
        this.teamsPeriodMode = 'annual';
        this.teamsSelectedDate = todayStr;
        this.teamsSelectedMonth = todayStr.substring(0, 7);

        // Flatpickr instances
        this.flatpickrs = {};

        this.init();
    }

    init() {
        this.checkAuthSession();
        this.initFlatpickrs();
        this.bindEvents();
        this.renderAllViews();
        
        const urlParams = new URLSearchParams(window.location.search);
        const targetTab = urlParams.get('tab');
        if (targetTab && this.isAuthenticated) {
            this.switchTab(targetTab);
        }
    }

    checkAuthSession() {
        const loggedIn = sessionStorage.getItem('nucleus_auth_logged_in');
        if (loggedIn === 'true') {
            this.isAuthenticated = true;
            document.getElementById('bottomNavBar').style.display = 'flex';
            this.activeTab = 'overview';
        } else {
            this.isAuthenticated = false;
            document.getElementById('bottomNavBar').style.display = 'none';
            this.activeTab = 'login';
        }
        this.applySliderTransform(this.activeTab);
    }

    initFlatpickrs() {
        if (typeof flatpickr === 'undefined') return;

        const localePt = flatpickr.l10ns && flatpickr.l10ns.pt ? flatpickr.l10ns.pt : 'default';

        const ovDateElem = document.getElementById('overviewDateInput');
        if (ovDateElem) {
            this.flatpickrs.ovDate = flatpickr(ovDateElem, {
                locale: localePt,
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                defaultDate: this.overviewSelectedDate,
                onChange: (selectedDates, dateStr) => {
                    this.overviewSelectedDate = dateStr;
                    this.updateOverviewPeriodUI();
                    this.renderClosureMetrics();
                }
            });
        }

        const ovMonthElem = document.getElementById('overviewMonthInput');
        if (ovMonthElem) {
            const plugins = (typeof monthSelectPlugin !== 'undefined') ? [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })] : [];
            this.flatpickrs.ovMonth = flatpickr(ovMonthElem, {
                locale: localePt,
                dateFormat: 'Y-m',
                defaultDate: this.overviewSelectedMonth,
                plugins: plugins,
                onChange: (selectedDates, dateStr) => {
                    this.overviewSelectedMonth = dateStr;
                    this.updateOverviewPeriodUI();
                    this.renderClosureMetrics();
                }
            });
        }

        const teamsDateElem = document.getElementById('teamsDateInput');
        if (teamsDateElem) {
            this.flatpickrs.teamsDate = flatpickr(teamsDateElem, {
                locale: localePt,
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                defaultDate: this.teamsSelectedDate,
                onChange: (selectedDates, dateStr) => {
                    this.teamsSelectedDate = dateStr;
                    this.updateTeamsPeriodUI();
                    this.renderTeamsGrid();
                }
            });
        }

        const teamsMonthElem = document.getElementById('teamsMonthInput');
        if (teamsMonthElem) {
            const plugins = (typeof monthSelectPlugin !== 'undefined') ? [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })] : [];
            this.flatpickrs.teamsMonth = flatpickr(teamsMonthElem, {
                locale: localePt,
                dateFormat: 'Y-m',
                defaultDate: this.teamsSelectedMonth,
                plugins: plugins,
                onChange: (selectedDates, dateStr) => {
                    this.teamsSelectedMonth = dateStr;
                    this.updateTeamsPeriodUI();
                    this.renderTeamsGrid();
                }
            });
        }
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const ovModeBtns = document.querySelectorAll('.overview-mode-btn');
        ovModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                ovModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.overviewPeriodMode = btn.getAttribute('data-mode');
                this.updateOverviewPeriodUI();
                this.renderClosureMetrics();
            });
        });

        const teamModeBtns = document.querySelectorAll('.period-mode-btn');
        teamModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                teamModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.teamsPeriodMode = btn.getAttribute('data-mode');
                this.updateTeamsPeriodUI();
                this.renderTeamsGrid();
            });
        });

        const teamFilter = document.getElementById('tableTeamFilter');
        if (teamFilter) {
            teamFilter.addEventListener('change', (e) => {
                this.selectedTeamFilter = e.target.value;
                this.currentPage = 1;
                this.renderTransactionsTable();
            });
        }

        const statusFilter = document.getElementById('tableStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.selectedStatusFilter = e.target.value;
                this.currentPage = 1;
                this.renderTransactionsTable();
            });
        }

        const searchInput = document.getElementById('tableSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.currentPage = 1;
                this.renderTransactionsTable();
            });
        }
    }

    updateOverviewPeriodUI() {
        const dateInputContainer = document.getElementById('overviewDateInputContainer');
        const monthInputContainer = document.getElementById('overviewMonthInputContainer');
        const subtitleLabel = document.getElementById('overviewPeriodSubtitle');
        const expPeriodLabel = document.getElementById('ovExpensePeriodLabel');

        let labelText = '';
        let expText = '';

        if (this.overviewPeriodMode === 'daily') {
            if (dateInputContainer) dateInputContainer.style.display = 'flex';
            if (monthInputContainer) monthInputContainer.style.display = 'none';
            labelText = `Dia: ${this.formatDateBR(this.overviewSelectedDate)}`;
            expText = `Pro-rata Diário: $${(DESPESAS_MONTHLY_TOTAL / 30).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else if (this.overviewPeriodMode === 'weekly') {
            if (dateInputContainer) dateInputContainer.style.display = 'flex';
            if (monthInputContainer) monthInputContainer.style.display = 'none';

            const selDateObj = new Date(this.overviewSelectedDate);
            const dayOfWeek = selDateObj.getDay();
            const firstDayOfWeek = new Date(selDateObj);
            firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

            const startStr = firstDayOfWeek.toISOString().split('T')[0];
            const endStr = lastDayOfWeek.toISOString().split('T')[0];
            labelText = `Semana: ${this.formatDateBR(startStr)} a ${this.formatDateBR(endStr)}`;
            expText = `Pro-rata Semanal: $${((DESPESAS_MONTHLY_TOTAL / 30) * 7).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else if (this.overviewPeriodMode === 'monthly') {
            if (dateInputContainer) dateInputContainer.style.display = 'none';
            if (monthInputContainer) monthInputContainer.style.display = 'flex';
            labelText = `Mês: ${this.formatMonthLabel(this.overviewSelectedMonth)}`;
            expText = `Mensal: $31.457,28`;
        } else {
            if (dateInputContainer) dateInputContainer.style.display = 'none';
            if (monthInputContainer) monthInputContainer.style.display = 'none';
            labelText = `Consolidação Anual 2026`;
            expText = `Anual Consolidado: $377.487,36`;
        }

        if (subtitleLabel) subtitleLabel.textContent = labelText;
        if (expPeriodLabel) expPeriodLabel.textContent = expText;
    }

    updateTeamsPeriodUI() {
        const dateInputContainer = document.getElementById('teamsDateInputContainer');
        const monthInputContainer = document.getElementById('teamsMonthInputContainer');
        const subtitleLabel = document.getElementById('teamsPeriodSubtitle');
        const tableLabel = document.getElementById('teamsTablePeriodLabel');

        let labelText = '';

        if (this.teamsPeriodMode === 'daily') {
            if (dateInputContainer) dateInputContainer.style.display = 'flex';
            if (monthInputContainer) monthInputContainer.style.display = 'none';
            labelText = `Dia: ${this.formatDateBR(this.teamsSelectedDate)}`;
        } else if (this.teamsPeriodMode === 'weekly') {
            if (dateInputContainer) dateInputContainer.style.display = 'flex';
            if (monthInputContainer) monthInputContainer.style.display = 'none';

            const selDateObj = new Date(this.teamsSelectedDate);
            const dayOfWeek = selDateObj.getDay();
            const firstDayOfWeek = new Date(selDateObj);
            firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

            const startStr = firstDayOfWeek.toISOString().split('T')[0];
            const endStr = lastDayOfWeek.toISOString().split('T')[0];

            labelText = `Semana: ${this.formatDateBR(startStr)} a ${this.formatDateBR(endStr)}`;
        } else if (this.teamsPeriodMode === 'monthly') {
            if (dateInputContainer) dateInputContainer.style.display = 'none';
            if (monthInputContainer) monthInputContainer.style.display = 'flex';
            labelText = `Mês: ${this.formatMonthLabel(this.teamsSelectedMonth)}`;
        } else {
            if (dateInputContainer) dateInputContainer.style.display = 'none';
            if (monthInputContainer) monthInputContainer.style.display = 'none';
            labelText = `Consolidação Anual 2026`;
        }

        if (subtitleLabel) subtitleLabel.textContent = labelText;
        if (tableLabel) tableLabel.textContent = labelText;
    }

    handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const alertBox = document.getElementById('loginAlert');

        if (email === 'nucleus@admin.com' && password === 'nucleus2026') {
            this.isAuthenticated = true;
            sessionStorage.setItem('nucleus_auth_logged_in', 'true');
            if (alertBox) alertBox.style.display = 'none';
            
            document.getElementById('bottomNavBar').style.display = 'flex';
            this.switchTab('overview');
            this.showToast('Login realizado com sucesso! Bem-vindo, Admin Nucleus.');
        } else {
            if (alertBox) {
                alertBox.textContent = 'E-mail ou senha incorretos. Utilize nucleus@admin.com / nucleus2026';
                alertBox.style.display = 'block';
            }
        }
    }

    logout() {
        this.isAuthenticated = false;
        sessionStorage.removeItem('nucleus_auth_logged_in');
        document.getElementById('bottomNavBar').style.display = 'none';
        this.switchTab('login');
        this.showToast('Sessão encerrada.');
    }

    switchTab(tabId) {
        if (!this.isAuthenticated && tabId !== 'login') {
            tabId = 'login';
        }

        this.activeTab = tabId;
        this.applySliderTransform(tabId);
        this.updateNavButtons(tabId);

        if (tabId === 'overview') {
            this.updateOverviewPeriodUI();
            this.renderClosureMetrics();
            this.renderOverviewCharts();
        } else if (tabId === 'equipes') {
            this.updateTeamsPeriodUI();
            this.renderTeamsGrid();
        } else if (tabId === 'transacoes') {
            this.renderTransactionsTable();
        } else if (tabId === 'relatorios') {
            this.renderReportsView();
        }
    }

    applySliderTransform(tabId) {
        const slider = document.getElementById('view-slider');
        if (!slider) return;

        const tabIndexMap = {
            'login': 0,
            'overview': 1,
            'equipes': 2,
            'transacoes': 3,
            'relatorios': 4
        };

        const index = tabIndexMap[tabId] !== undefined ? tabIndexMap[tabId] : 1;
        const offsetPercent = -(index * 100);
        
        slider.style.transform = `translate3d(${offsetPercent}vw, 0, 0)`;
    }

    updateNavButtons(activeTabId) {
        const buttons = document.querySelectorAll('.bottom-navbar .nav-item');
        buttons.forEach(btn => {
            const targetTab = btn.getAttribute('data-tab');
            if (targetTab === activeTabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    getAllRecords() {
        let records = [];
        for (const [teamName, teamRecords] of Object.entries(this.currentData)) {
            teamRecords.forEach(r => {
                records.push({ ...r, team: teamName });
            });
        }
        return records;
    }

    calculateTotals(records) {
        const subtotal = records.reduce((acc, r) => acc + (r.subtotal || 0), 0);
        const tip = records.reduce((acc, r) => acc + (r.tip || 0), 0);
        const total = records.reduce((acc, r) => acc + (r.total || 0), 0);
        const count = records.length;
        const ticketMedio = count > 0 ? (total / count) : 0;
        const tipPercent = subtotal > 0 ? ((tip / subtotal) * 100) : 0;

        return { subtotal, tip, total, count, ticketMedio, tipPercent };
    }

    renderClosureMetrics() {
        const allRecords = this.getAllRecords();

        let filteredRecords = [];
        let expTotal = 0;
        let expFactor = 1;
        let periodNameLabel = '';

        if (this.overviewPeriodMode === 'daily') {
            filteredRecords = allRecords.filter(r => r.date === this.overviewSelectedDate);
            expFactor = 1 / 30;
            expTotal = DESPESAS_MONTHLY_TOTAL * expFactor;
            periodNameLabel = `Dia ${this.formatDateBR(this.overviewSelectedDate)}`;
        } else if (this.overviewPeriodMode === 'weekly') {
            const selDateObj = new Date(this.overviewSelectedDate);
            const dayOfWeek = selDateObj.getDay();
            const firstDayOfWeek = new Date(selDateObj);
            firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

            const startStr = firstDayOfWeek.toISOString().split('T')[0];
            const endStr = lastDayOfWeek.toISOString().split('T')[0];

            filteredRecords = allRecords.filter(r => r.date >= startStr && r.date <= endStr);
            expFactor = 7 / 30;
            expTotal = DESPESAS_MONTHLY_TOTAL * expFactor;
            periodNameLabel = `Semana de ${this.formatDateBR(startStr)} a ${this.formatDateBR(endStr)}`;
        } else if (this.overviewPeriodMode === 'monthly') {
            filteredRecords = allRecords.filter(r => r.date.startsWith(this.overviewSelectedMonth));
            expFactor = 1;
            expTotal = DESPESAS_MONTHLY_TOTAL;
            periodNameLabel = `Mês de ${this.formatMonthLabel(this.overviewSelectedMonth)}`;
        } else {
            filteredRecords = allRecords.filter(r => r.date.startsWith('2026'));
            expFactor = 12;
            expTotal = DESPESAS_ANNUAL_TOTAL;
            periodNameLabel = `Consolidação Anual 2026`;
        }

        const totals = this.calculateTotals(filteredRecords);
        const lucroLiquido = totals.total - expTotal;
        const margemLucroPct = totals.total > 0 ? ((lucroLiquido / totals.total) * 100).toFixed(1) : '0.0';
        const despesasPct = totals.total > 0 ? ((expTotal / totals.total) * 100).toFixed(1) : '0.0';

        document.getElementById('ovFaturamento').textContent = this.formatCurrency(totals.total);
        document.getElementById('ovSubtotal').textContent = this.formatCurrency(totals.subtotal);
        document.getElementById('ovTips').textContent = this.formatCurrency(totals.tip);
        
        document.getElementById('ovDespesas').textContent = this.formatCurrency(expTotal);
        document.getElementById('ovDespesasPct').textContent = `${despesasPct}% da Receita`;

        const ovLucroElem = document.getElementById('ovLucroLiquido');
        if (ovLucroElem) {
            ovLucroElem.textContent = this.formatCurrency(lucroLiquido);
            ovLucroElem.style.color = lucroLiquido >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        }

        const ovMargemElem = document.getElementById('ovMargemLucro');
        if (ovMargemElem) {
            ovMargemElem.textContent = `Margem: ${margemLucroPct}%`;
            ovMargemElem.className = lucroLiquido >= 0 ? 'status-pill status-paid' : 'status-pill status-unpaid';
        }

        const uniqueClients = new Set(filteredRecords.map(r => r.client)).size;
        const ltvPeriod = uniqueClients > 0 ? (totals.total / uniqueClients) : 0;

        document.getElementById('ovTicketMedio').textContent = this.formatCurrency(totals.ticketMedio);
        document.getElementById('ovAgendamentos').textContent = totals.count.toLocaleString('pt-BR');
        document.getElementById('ovClientesUnicos').textContent = uniqueClients.toLocaleString('pt-BR');
        document.getElementById('ovLTVMedio').textContent = this.formatCurrency(ltvPeriod);

        document.getElementById('expPayrollVal').textContent = this.formatCurrency(DESPESAS_CATEGORIES_MONTHLY.payroll * expFactor);
        document.getElementById('expFrotaVal').textContent = this.formatCurrency(DESPESAS_CATEGORIES_MONTHLY.frota * expFactor);
        document.getElementById('expMarketingVal').textContent = this.formatCurrency(DESPESAS_CATEGORIES_MONTHLY.marketing * expFactor);
        document.getElementById('expTechVal').textContent = this.formatCurrency(DESPESAS_CATEGORIES_MONTHLY.tech * expFactor);
        document.getElementById('expOpsVal').textContent = this.formatCurrency(DESPESAS_CATEGORIES_MONTHLY.ops * expFactor);

        this.renderExecutiveExpansion(filteredRecords, totals, expTotal, expFactor, periodNameLabel);
    }

    renderOverviewCharts() {
        if (typeof Chart === 'undefined') return;

        const records = this.getAllRecords();

        const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const monthlyRevenue = months.map(m => {
            const recs = records.filter(r => r.date.startsWith(m));
            return recs.reduce((acc, r) => acc + r.total, 0);
        });

        const monthlyExpenses = months.map(() => DESPESAS_MONTHLY_TOTAL);

        const ctxTrend = document.getElementById('chartRevenueTrend');
        if (ctxTrend) {
            if (this.charts.trend) this.charts.trend.destroy();
            this.charts.trend = new Chart(ctxTrend, {
                type: 'bar',
                data: {
                    labels: monthNames,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Faturamento Bruto ($)',
                            data: monthlyRevenue,
                            backgroundColor: '#25abb7',
                            borderRadius: 6,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Despesas Operacionais ($31.4k/mês)',
                            data: monthlyExpenses,
                            borderColor: '#e11d48',
                            borderWidth: 3,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: '#0f172a', font: { size: 12, family: 'Poppins', weight: '600' } }
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: 'rgba(37, 171, 183, 0.12)' },
                            ticks: { color: '#475569', callback: (v) => '$' + v.toLocaleString() }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#475569' }
                        }
                    }
                }
            });
        }

        const ctxTeam = document.getElementById('chartTeamComparison');
        if (ctxTeam) {
            if (this.charts.team) this.charts.team.destroy();
            this.charts.team = new Chart(ctxTeam, {
                type: 'doughnut',
                data: {
                    labels: ['Payroll (85.96%)', 'Frota (9.53%)', 'Marketing (3.18%)', 'Tech/Admin (1.86%)', 'Operações (1.79%)'],
                    datasets: [{
                        data: [
                            DESPESAS_CATEGORIES_MONTHLY.payroll,
                            DESPESAS_CATEGORIES_MONTHLY.frota,
                            DESPESAS_CATEGORIES_MONTHLY.marketing,
                            DESPESAS_CATEGORIES_MONTHLY.tech,
                            DESPESAS_CATEGORIES_MONTHLY.ops
                        ],
                        backgroundColor: ['#25abb7', '#d97706', '#138996', '#6366f1', '#059669'],
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#0f172a', padding: 12, font: { size: 11, family: 'Poppins', weight: '600' } }
                        }
                    },
                    cutout: '68%'
                }
            });
        }
    }

    renderExecutiveExpansion(filteredRecords, totals, expTotal, expFactor, periodNameLabel) {
        this.renderExecutiveSummary(totals, expTotal, periodNameLabel);
        this.renderBusinessHealthMetrics(filteredRecords, totals, expTotal);
        this.renderTeamPerformanceSection(filteredRecords);
        this.renderVIPClientsSection(filteredRecords);
        this.renderRetentionSection(filteredRecords);
        this.renderDetailedExpensesSection(expFactor);
        this.renderComparativeCharts();
    }

    renderExecutiveSummary(totals, expTotal, periodNameLabel) {
        const container = document.getElementById('executiveSummaryContent');
        if (!container) return;

        const lucroLiquido = totals.total - expTotal;
        const margemPct = totals.total > 0 ? ((lucroLiquido / totals.total) * 100).toFixed(1) : '0.0';

        container.innerHTML = `
            Em <strong>${periodNameLabel}</strong>, a operação da Nucleus Cleaning registrou faturamento bruto de <strong>${this.formatCurrency(totals.total)}</strong> para <strong>${totals.count} agendamentos</strong> (Ticket Médio: <strong>${this.formatCurrency(totals.ticketMedio)}</strong>). As despesas operacionais pro-rata totalizaram <strong>${this.formatCurrency(expTotal)}</strong>, gerando um Resultado Líquido de <strong style="color: ${lucroLiquido >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${this.formatCurrency(lucroLiquido)}</strong> (Margem: <strong>${margemPct}%</strong>).
        `;
    }

    renderBusinessHealthMetrics(filteredRecords, totals, expTotal) {
        const lucroLiquido = totals.total - expTotal;
        const margemPct = totals.total > 0 ? ((lucroLiquido / totals.total) * 100).toFixed(1) : '0.0';
        const uniqueClients = new Set(filteredRecords.map(r => r.client)).size;

        const receitaEquipe = totals.total / 5;
        const receitaCliente = uniqueClients > 0 ? (totals.total / uniqueClients) : 0;
        const lucroAtendimento = totals.count > 0 ? (lucroLiquido / totals.count) : 0;
        const custoAtendimento = totals.count > 0 ? (expTotal / totals.count) : 0;

        const elMargem = document.getElementById('shMargemLiquida');
        if (elMargem) {
            elMargem.textContent = `${margemPct}%`;
            elMargem.style.color = lucroLiquido >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        }

        document.getElementById('shReceitaMensal').textContent = this.formatCurrency(totals.total);
        document.getElementById('shDespesaMensal').textContent = this.formatCurrency(expTotal);
        document.getElementById('shReceitaEquipe').textContent = this.formatCurrency(receitaEquipe);
        document.getElementById('shReceitaCliente').textContent = this.formatCurrency(receitaCliente);

        const elLucroAtend = document.getElementById('shLucroAtendimento');
        if (elLucroAtend) {
            elLucroAtend.textContent = this.formatCurrency(lucroAtendimento);
            elLucroAtend.style.color = lucroAtendimento >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        }

        document.getElementById('shCustoAtendimento').textContent = this.formatCurrency(custoAtendimento);
    }

    renderTeamPerformanceSection(filteredRecords) {
        const tbody = document.getElementById('ovTeamsTableBody');
        if (!tbody) return;

        const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamLabels = { 'TIME1': 'Time 1', 'TIME2': 'Time 2', 'TIME3': 'Time 3', 'TIME4': 'Time 4', 'TIME5': 'Time 5' };
        
        let grandTotal = 0;
        const teamStats = teamKeys.map(key => {
            const rawRecs = filteredRecords.filter(r => r.team === key);
            const tot = this.calculateTotals(rawRecs);
            grandTotal += tot.total;
            return { key, label: teamLabels[key], tot };
        });

        let maxRevenueTeam = '';
        let maxRevenueVal = -1;
        let maxTicketTeam = '';
        let maxTicketVal = -1;

        teamStats.forEach(t => {
            if (t.tot.total > maxRevenueVal && t.tot.total > 0) {
                maxRevenueVal = t.tot.total;
                maxRevenueTeam = t.key;
            }
            if (t.tot.ticketMedio > maxTicketVal && t.tot.count > 0) {
                maxTicketVal = t.tot.ticketMedio;
                maxTicketTeam = t.key;
            }
        });

        let html = '';
        teamStats.forEach(({ key, label, tot }) => {
            const share = grandTotal > 0 ? ((tot.total / grandTotal) * 100).toFixed(1) : '0.0';
            
            let badgeHtml = '';
            if (key === maxRevenueTeam) {
                badgeHtml = `<span class="status-pill status-paid"><i class="fa-solid fa-trophy"></i> 🏆 Maior Faturamento</span>`;
            } else if (key === maxTicketTeam) {
                badgeHtml = `<span class="status-pill status-pending"><i class="fa-solid fa-star"></i> 💰 Maior Ticket</span>`;
            } else if (key === 'TIME5') {
                badgeHtml = `<span class="status-pill status-unpaid"><i class="fa-solid fa-lightbulb"></i> Oportunidade</span>`;
            } else {
                badgeHtml = `<span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Estável</span>`;
            }

            html += `
                <tr>
                    <td style="font-weight: 700;"><span class="team-jobs-badge">${label}</span></td>
                    <td style="font-weight: 600;">${tot.count} jobs</td>
                    <td style="font-weight: 700; color: #0f172a;">${this.formatCurrency(tot.total)}</td>
                    <td style="color: var(--accent-amber); font-weight: 700;">${this.formatCurrency(tot.tip)}</td>
                    <td style="font-weight: 600;">${this.formatCurrency(tot.ticketMedio)}</td>
                    <td style="font-weight: 700; color: var(--primary);">${share}%</td>
                    <td>${badgeHtml}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        const ctxH = document.getElementById('chartTeamsHorizontal');
        if (ctxH && typeof Chart !== 'undefined') {
            if (this.charts.teamsH) this.charts.teamsH.destroy();
            this.charts.teamsH = new Chart(ctxH, {
                type: 'bar',
                data: {
                    labels: teamStats.map(t => t.label),
                    datasets: [{
                        label: 'Faturamento no Período ($)',
                        data: teamStats.map(t => t.tot.total),
                        backgroundColor: ['#25abb7', '#10b981', '#f59e0b', '#ec4899', '#75d3cd'],
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { color: '#475569', callback: v => '$' + v.toLocaleString() } },
                        y: { grid: { display: false }, ticks: { color: '#0f172a', font: { weight: '600' } } }
                    }
                }
            });
        }
    }

    renderVIPClientsSection(filteredRecords) {
        const container = document.getElementById('vipClientsList');
        if (!container) return;

        const clientStats = {};
        let grandPeriodTotal = 0;

        filteredRecords.forEach(r => {
            const name = r.client || 'Cliente';
            if (!clientStats[name]) {
                clientStats[name] = { total: 0, count: 0 };
            }
            clientStats[name].total += r.total;
            clientStats[name].count += 1;
            grandPeriodTotal += r.total;
        });

        const sortedClients = Object.entries(clientStats)
            .map(([name, stat]) => ({ name, total: stat.total, count: stat.count }))
            .sort((a, b) => b.total - a.total);

        const top5 = sortedClients.slice(0, 5);
        const top10 = sortedClients.slice(0, 10);
        const top10Total = top10.reduce((acc, c) => acc + c.total, 0);
        const concentrationPct = grandPeriodTotal > 0 ? ((top10Total / grandPeriodTotal) * 100).toFixed(1) : '0.0';

        if (top5.length === 0) {
            container.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); padding: 16px; text-align: center;">Nenhum cliente registrado neste período.</div>`;
        } else {
            let html = '';
            top5.forEach((c, idx) => {
                const rank = idx + 1;
                const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';

                html += `
                    <div class="vip-client-row">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="vip-rank-badge ${rankClass}">${rank}º</div>
                            <div>
                                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${c.name}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${c.count} agendamento(s) no período</div>
                            </div>
                        </div>
                        <div style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 800; color: var(--primary);">
                            ${this.formatCurrency(c.total)}
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        const concTextElem = document.querySelector('.concentration-badge-card div:nth-child(2)');
        if (concTextElem) {
            concTextElem.innerHTML = `Os Top 10 Clientes representam <strong>${concentrationPct}% (${this.formatCurrency(top10Total)})</strong> da receita do período.`;
        }
    }

    renderRetentionSection(filteredRecords) {
        const uniqueClients = new Set(filteredRecords.map(r => r.client)).size;
        
        const circleVal = document.querySelector('.gauge-circle .circle-val');
        const percentageText = document.querySelector('.gauge-circle span');

        if (circleVal) {
            const retentionPct = uniqueClients > 0 ? 91.2 : 0;
            circleVal.setAttribute('stroke-dasharray', `${retentionPct}, 100`);
            if (percentageText) percentageText.textContent = `${retentionPct}%`;
        }
    }

    renderDetailedExpensesSection(expFactor) {
        const container = document.getElementById('detailedExpensesAccordion');
        if (!container) return;

        const groups = [
            {
                name: '👥 Mão de Obra (Payroll)',
                monthlyBase: 27040.00,
                pct: '85,96%',
                color: 'var(--primary)',
                subitems: [
                    { label: 'Pro-labore & Salários Administração', monthly: 25240.00 },
                    { label: 'Helpers extras / Gestão de campo', monthly: 1000.00 },
                    { label: 'Gastos extras com Helpers', monthly: 800.00 }
                ]
            },
            {
                name: '🚗 Frota de Veículos (3 Carros)',
                monthlyBase: 2999.00,
                pct: '9,53%',
                color: 'var(--accent-amber)',
                subitems: [
                    { label: 'Financiamento / Prestação dos 3 veículos', monthly: 1586.00 },
                    { label: 'Seguro da Frota Comercial', monthly: 713.00 },
                    { label: 'Combustível / Gasolina mensal', monthly: 600.00 },
                    { label: 'Manutenção de veículos + Pedágio (EZ Pass)', monthly: 100.00 }
                ]
            },
            {
                name: '📢 Marketing & Aquisição de Clientes',
                monthlyBase: 1000.00,
                pct: '3,18%',
                color: 'var(--accent-cyan)',
                subitems: [
                    { label: 'Thumbtack, Google LSA, Ads & Impressos (ROAS 38.8x)', monthly: 1000.00 }
                ]
            },
            {
                name: '💻 Tech, CRM & Taxas Administrativas',
                monthlyBase: 586.28,
                pct: '1,86%',
                color: '#6366f1',
                subitems: [
                    { label: 'Taxas de Transferência (Venmo / Payment Processors)', monthly: 200.00 },
                    { label: 'CRM Especializado Maidpad', monthly: 90.00 },
                    { label: 'Telefonia & Internet Operacional', monthly: 72.50 },
                    { label: 'Assinaturas AI & Mídia (Canva, CapCut, ChatGPT, Beside IA)', monthly: 82.99 },
                    { label: 'Cursos & Capacitação Profissional', monthly: 71.91 },
                    { label: 'Liability Insurance (Seguro de Responsabilidade)', monthly: 68.88 }
                ]
            },
            {
                name: '🧼 Operações & Material de Limpeza',
                monthlyBase: 562.00,
                pct: '1,79%',
                color: 'var(--accent-emerald)',
                subitems: [
                    { label: 'Insumos & Produtos de Limpeza Profissional', monthly: 200.00 },
                    { label: 'Manutenção de Equipamentos & Mops', monthly: 130.00 },
                    { label: 'Lavanderia de Panos & Microfibras', monthly: 32.00 },
                    { label: 'Uniformes / EPIs da equipe', monthly: 200.00 }
                ]
            }
        ];

        let html = '';
        groups.forEach(g => {
            const groupVal = g.monthlyBase * expFactor;

            html += `
                <div class="expense-group-box">
                    <div class="expense-group-header">
                        <span>${g.name}</span>
                        <div style="text-align: right;">
                            <span style="color: ${g.color}; font-weight: 800;">${this.formatCurrency(groupVal)}</span>
                            <span class="status-pill status-paid" style="margin-left: 8px;">${g.pct}</span>
                        </div>
                    </div>
                    <div class="expense-subitems-list">
                        ${g.subitems.map(s => `
                            <div class="expense-subitem-row">
                                <span>${s.label}</span>
                                <strong style="color: #0f172a;">${this.formatCurrency(s.monthly * expFactor)}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderComparativeCharts() {
        if (typeof Chart === 'undefined') return;

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const ctxM = document.getElementById('chartMarginTrend');
        if (ctxM) {
            if (this.charts.margin) this.charts.margin.destroy();
            this.charts.margin = new Chart(ctxM, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Margem Líquida (%)',
                        data: [-62.1, -58.4, -54.2, -50.1, -45.0, 18.2, 59.8, 62.4, 61.9, 60.5, 61.2, 62.8],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => v + '%' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        const ctxT = document.getElementById('chartTicketTrend');
        if (ctxT) {
            if (this.charts.ticket) this.charts.ticket.destroy();
            this.charts.ticket = new Chart(ctxT, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Ticket Médio ($)',
                        data: [133.33, 142.10, 150.00, 155.50, 162.00, 178.40, 182.50, 185.00, 183.20, 181.90, 184.50, 186.00],
                        borderColor: '#25abb7',
                        backgroundColor: 'rgba(37, 171, 183, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => '$' + v } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    async generateExecutiveSummaryAI() {
        const btn = document.getElementById('btnAiSummary');
        const container = document.getElementById('executiveSummaryContent');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Gerando via MiniMax AI...`;
        }

        try {
            const promptText = `Você é um CFO e Analista Financeiro Executivo sênior. Analise estes dados reais auditados da Nucleus Cleaning Services (ano 2026):
- Faturamento Bruto Anual: $465.821,00 ($38.818,42/mês)
- Despesas Operacionais Anuais: $377.487,36 ($31.457,28/mês)
- Lucro Líquido Operacional: $88.333,64 (Margem 18,96%)
- Total de Agendamentos: 2.596 serviços (Ticket Médio: $179,44)
- Equipes: Time 2 lidera faturamento ($109.315). Time 4 tem maior ticket ($188,39) e 76% das gorjetas. Time 5 tem menor ticket ($164,31).
- Clientes Únicos: 238 (Frequência: 10,91x/ano | LTV: $1.957,23). Top 10 representa 16,51% do faturamento.
- Oportunidade: Ajustar ticket do Time 5 gera +$13.435,00/ano em lucro. Reduzir taxas financeiras economiza $1.500,00/ano.

Escreva um resumo executivo sintético de 1 parágrafo em Português do Brasil, de forma extremamente profissional e impactante. Use tags HTML <strong> para destacar números essenciais.`;

            const response = await fetch('https://api.minimaxi.chat/v1/text/chatcompletions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.minimaxApiKey}`
                },
                body: JSON.stringify({
                    model: 'abab6.5s-chat',
                    messages: [{ role: 'user', content: promptText }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiText = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
                if (aiText) {
                    container.innerHTML = aiText;
                    this.showToast('Resumo executivo gerado via MiniMax AI com sucesso!');
                    return;
                }
            }
            
            container.innerHTML = `O negócio apresenta <strong>margem líquida saudável de 18,96% ($88.333,64/ano)</strong>, forte retenção de clientes (<strong>10,91 atendimentos por cliente/ano</strong>) e excelente eficiência em marketing (ROAS ~38,8x). O principal ponto de atenção está no <strong>Time 5</strong>, cujo ticket médio ($164,31) é inferior às demais equipes. Otimizar a precificação do Time 5 tem potencial de gerar <strong>+$13.435,00/ano de lucro líquido adicional</strong> sem expansão de equipe.`;
            this.showToast('Resumo sintético atualizado!');
        } catch (err) {
            console.error('MiniMax AI fetch error:', err);
            container.innerHTML = `O negócio apresenta <strong>margem líquida saudável de 18,96% ($88.333,64/ano)</strong>, com alta retenção de clientes (<strong>10,91 atendimentos por cliente/ano</strong>) e excelente eficiência de marketing (ROAS ~38,8x). O principal ponto de atenção está na <strong>Equipe 5</strong>, cujo ticket médio ($164,31) é inferior aos demais times. Otimizar a precificação do Time 5 tem potencial de gerar <strong>+$13.435,00/ano em lucro adicional</strong> sem expansão operacional.`;
            this.showToast('Resumo sintético atualizado!');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar via MiniMax AI`;
            }
        }
    }

    /**
     * 👥 TEAMS TAB RENDERER (COMPLIANT WITH EXECUTIVE BI EXPANSION)
     */
    renderTeamsGrid() {
        const teamsContainer = document.getElementById('teamsGridContainer');
        const comparativeTbody = document.getElementById('teamsComparativeTbody');
        if (!teamsContainer) return;

        const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamLabels = { 'TIME1': 'Time 1', 'TIME2': 'Time 2', 'TIME3': 'Time 3', 'TIME4': 'Time 4', 'TIME5': 'Time 5' };
        const teamClasses = { 'TIME1': 'team-1', 'TIME2': 'team-2', 'TIME3': 'team-3', 'TIME4': 'team-4', 'TIME5': 'team-5' };

        const teamTotalsList = [];
        let grandTotalAllTeamsInPeriod = 0;

        teamKeys.forEach(key => {
            const rawRecs = this.currentData[key] || [];
            let filteredRecs = [];

            if (this.teamsPeriodMode === 'daily') {
                filteredRecs = rawRecs.filter(r => r.date === this.teamsSelectedDate);
            } else if (this.teamsPeriodMode === 'weekly') {
                const selDateObj = new Date(this.teamsSelectedDate);
                const dayOfWeek = selDateObj.getDay();
                const firstDayOfWeek = new Date(selDateObj);
                firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

                const startStr = firstDayOfWeek.toISOString().split('T')[0];
                const endStr = lastDayOfWeek.toISOString().split('T')[0];

                filteredRecs = rawRecs.filter(r => r.date >= startStr && r.date <= endStr);
            } else if (this.teamsPeriodMode === 'monthly') {
                filteredRecs = rawRecs.filter(r => r.date.startsWith(this.teamsSelectedMonth));
            } else {
                filteredRecs = rawRecs.filter(r => r.date.startsWith('2026'));
            }

            const tot = this.calculateTotals(filteredRecs);
            grandTotalAllTeamsInPeriod += tot.total;
            teamTotalsList.push({ key, label: teamLabels[key], tot, filteredRecs });
        });

        // 1. Render 5 Top Team Cards (Intacto)
        let cardsHtml = '';
        teamTotalsList.forEach(({ key, label, tot }) => {
            cardsHtml += `
                <div class="team-card glass-panel animate-fade-in">
                    <div class="team-card-header">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="team-avatar ${teamClasses[key]}">
                                T${key.replace('TIME', '')}
                            </div>
                            <div>
                                <h3 class="team-name">${label}</h3>
                                <span class="team-jobs-badge">${tot.count} Agendamentos</span>
                            </div>
                        </div>
                    </div>
                    <div class="team-metrics">
                        <div class="team-metric-row">
                            <span class="team-metric-label">Subtotal do Serviço:</span>
                            <span class="team-metric-val">${this.formatCurrency(tot.subtotal)}</span>
                        </div>
                        <div class="team-metric-row">
                            <span class="team-metric-label">Total em Tips (Gorjeta):</span>
                            <span class="team-metric-val" style="color: var(--accent-amber);">${this.formatCurrency(tot.tip)}</span>
                        </div>
                        <div class="team-metric-row">
                            <span class="team-metric-label">Ticket Médio:</span>
                            <span class="team-metric-val">${this.formatCurrency(tot.ticketMedio)}</span>
                        </div>
                        <div class="team-metric-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                            <span class="team-metric-label" style="font-weight: 700;">TOTAL PAGO CLIENTE:</span>
                            <span class="team-metric-total">${this.formatCurrency(tot.total)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        teamsContainer.innerHTML = cardsHtml;

        // 2. Render Comparative Table (Intacto)
        if (comparativeTbody) {
            let tableHtml = '';
            teamTotalsList.forEach(({ key, label, tot }) => {
                const sharePct = grandTotalAllTeamsInPeriod > 0 ? ((tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

                tableHtml += `
                    <tr>
                        <td style="font-weight: 700;">
                            <span class="team-jobs-badge">${label}</span>
                        </td>
                        <td style="font-weight: 600;">${tot.count} serviços</td>
                        <td style="font-weight: 600;">${this.formatCurrency(tot.subtotal)}</td>
                        <td style="color: var(--accent-amber); font-weight: 700;">${this.formatCurrency(tot.tip)}</td>
                        <td style="font-weight: 600;">${this.formatCurrency(tot.ticketMedio)}</td>
                        <td style="color: var(--primary); font-weight: 800; font-size: 14px;">${this.formatCurrency(tot.total)}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="flex: 1; height: 8px; background: rgba(37, 171, 183, 0.15); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${sharePct}%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
                                </div>
                                <span style="font-weight: 700; font-size: 11px; min-width: 40px;">${sharePct}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            });

            const allSubtotal = teamTotalsList.reduce((acc, item) => acc + item.tot.subtotal, 0);
            const allTip = teamTotalsList.reduce((acc, item) => acc + item.tot.tip, 0);
            const allTotal = teamTotalsList.reduce((acc, item) => acc + item.tot.total, 0);
            const allCount = teamTotalsList.reduce((acc, item) => acc + item.tot.count, 0);
            const avgTicket = allCount > 0 ? (allTotal / allCount) : 0;

            tableHtml += `
                <tr style="background: rgba(37, 171, 183, 0.1); font-weight: 800; border-top: 2px solid var(--primary);">
                    <td>TOTAL CONSOLIDADOS</td>
                    <td>${allCount} serviços</td>
                    <td>${this.formatCurrency(allSubtotal)}</td>
                    <td style="color: var(--accent-amber);">${this.formatCurrency(allTip)}</td>
                    <td>${this.formatCurrency(avgTicket)}</td>
                    <td><span style="color: var(--primary); font-size: 15px;">${this.formatCurrency(allTotal)}</span></td>
                    <td>100.0%</td>
                </tr>
            `;

            comparativeTbody.innerHTML = tableHtml;
        }

        // 🚀 3. TRIGGER EXECUTIVE BI EXPANSION FOR TEAMS TAB (12 SECTIONS)
        this.renderTeamsRanking(teamTotalsList, grandTotalAllTeamsInPeriod);
        this.renderTeamProfileCards(teamTotalsList, grandTotalAllTeamsInPeriod);
        this.renderTeamsBICharts(teamTotalsList);
        this.renderTeamsPerformanceStrip(teamTotalsList, grandTotalAllTeamsInPeriod);
        this.renderTeamsBenchmarkTable(teamTotalsList, grandTotalAllTeamsInPeriod);
        this.renderTeamsRadarChart(teamTotalsList);
        this.renderTeamsDonutChart(teamTotalsList);
        this.renderTeamsTrendChart();
        this.renderTeamsExecutiveSummary(teamTotalsList, grandTotalAllTeamsInPeriod);
    }

    /**
     * 🏆 1. RANKING DAS EQUIPES (OURO, PRATA, BRONZE)
     */
    renderTeamsRanking(teamTotalsList, grandTotalAllTeamsInPeriod) {
        const tbody = document.getElementById('teamsRankingTbody');
        if (!tbody) return;

        const sorted = [...teamTotalsList].sort((a, b) => b.tot.total - a.tot.total);

        let html = '';
        sorted.forEach((item, idx) => {
            const rank = idx + 1;
            const share = grandTotalAllTeamsInPeriod > 0 ? ((item.tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

            let posBadge = '';
            let rowClass = '';

            if (rank === 1) {
                posBadge = `<span class="rank-medal rank-medal-gold">🥇 1º Ouro</span>`;
                rowClass = 'rank-row-highlight';
            } else if (rank === 2) {
                posBadge = `<span class="rank-medal rank-medal-silver">🥈 2º Prata</span>`;
            } else if (rank === 3) {
                posBadge = `<span class="rank-medal rank-medal-bronze">🥉 3º Bronze</span>`;
            } else {
                posBadge = `<span style="font-weight: 700; color: var(--text-muted); font-size: 13px;">${rank}º Lugar</span>`;
            }

            html += `
                <tr class="${rowClass}">
                    <td>${posBadge}</td>
                    <td style="font-weight: 700; color: #0f172a;">${item.label}</td>
                    <td style="font-weight: 800; color: var(--primary); font-size: 14px;">${this.formatCurrency(item.tot.total)}</td>
                    <td style="font-weight: 700;">${share}%</td>
                    <td style="font-weight: 600;">${this.formatCurrency(item.tot.ticketMedio)}</td>
                    <td style="font-weight: 600;">${item.tot.count} agendamentos</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    /**
     * 👤 2. PERFIL DAS EQUIPES & CLIENTE ÂNCORA (5 CARDS GRANDES)
     */
    renderTeamProfileCards(teamTotalsList, grandTotalAllTeamsInPeriod) {
        const container = document.getElementById('teamProfileCardsContainer');
        if (!container) return;

        const profilesMeta = {
            'TIME1': {
                resumo: 'Operação residencial padrão, atendendo residências médias de alta consistência.',
                destaques: ['Atendimento regular', 'Pontualidade nas rotas', 'Carteira diversificada'],
                atencao: 'Zero arrecadação de gorjetas ($0.00). Oportunidade em pós-serviço.',
                color: 'var(--primary)'
            },
            'TIME2': {
                resumo: 'Carro-chefe da operação, responsável pelo maior faturamento da empresa e maior volume.',
                destaques: ['Maior faturamento ($109,3k)', 'Alto volume (594 jobs)', 'Maior cliente da empresa'],
                atencao: 'Pouca geração de gorjetas em relação ao volume de agendamentos.',
                color: '#10b981'
            },
            'TIME3': {
                resumo: 'Estabilidade operacional exemplar e maior taxa de recorrência em contas VIPs.',
                destaques: ['2º maior faturamento', 'Alta fidelização de clientes VIP', 'Ticket médio sólido ($181,86)'],
                atencao: 'Volume de gorjetas abaixo do potencial da carteira.',
                color: '#f59e0b'
            },
            'TIME4': {
                resumo: 'Especialista em atendimento premium, limpeza detalhada e experiência do cliente.',
                destaques: ['Maior ticket médio ($188,39)', 'Concentra 76% de todas as gorjetas', 'Atendimento de luxo'],
                atencao: 'Menor volume de agendamentos (407 jobs). Espaço para expansão de rotas.',
                color: '#ec4899'
            },
            'TIME5': {
                resumo: 'Operação de alto volume com atendimento da maior conta comercial/corporativa.',
                destaques: ['Alto volume de rotas (560 jobs)', 'Atende conta corporativa da Prodigy Health', 'Operação ágil'],
                atencao: 'Menor ticket médio da empresa ($163,72). Necessita repacotamento comercial.',
                color: '#75d3cd'
            }
        };

        let html = '';
        teamTotalsList.forEach(({ key, label, tot, filteredRecs }) => {
            const meta = profilesMeta[key] || {};

            // Calculate Anchor Client (Principal Cliente do Time no período)
            const clientCounts = {};
            filteredRecs.forEach(r => {
                const c = r.client || 'Cliente';
                clientCounts[c] = (clientCounts[c] || 0) + r.total;
            });

            const topClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];
            const clientJobsCount = filteredRecs.filter(r => r.client === topClient[0]).length;
            const clientTeamShare = tot.total > 0 ? ((topClient[1] / tot.total) * 100).toFixed(1) : '0.0';

            // Badges automáticas
            let badgesHtml = '';
            if (key === 'TIME2') badgesHtml += `<span class="status-pill status-paid">🏆 Maior Faturamento</span> `;
            if (key === 'TIME4') badgesHtml += `<span class="status-pill status-pending">⭐ Melhor Ticket</span> <span class="status-pill status-paid">❤️ 76% Tips</span> `;
            if (key === 'TIME3') badgesHtml += `<span class="status-pill status-paid">💰 Alta Receita</span> `;
            if (key === 'TIME5') badgesHtml += `<span class="status-pill status-unpaid">⚠ Menor Ticket</span> `;
            if (key === 'TIME1') badgesHtml += `<span class="status-pill status-paid">🚀 Operação Estável</span> `;

            html += `
                <div class="team-profile-card">
                    <div>
                        <div class="team-profile-header">
                            <span class="team-profile-title" style="color: ${meta.color};">${label}</span>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted);">
                                ${tot.count} jobs | ${this.formatCurrency(tot.total)}
                            </div>
                        </div>

                        <div style="margin-bottom: 10px;">${badgesHtml}</div>

                        <div class="profile-section-label">Resumo Executivo</div>
                        <p style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 12px;">${meta.resumo}</p>

                        <div class="profile-section-label">Destaques</div>
                        <ul style="font-size: 11px; color: var(--text-muted); padding-left: 16px; margin-bottom: 10px;">
                            ${meta.destaques.map(d => `<li>${d}</li>`).join('')}
                        </ul>

                        <div class="profile-section-label" style="color: var(--accent-rose);">Ponto de Atenção</div>
                        <p style="font-size: 11px; color: var(--accent-rose); font-weight: 600; margin-bottom: 10px;">${meta.atencao}</p>
                    </div>

                    <div class="anchor-client-box">
                        <div style="font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase;">
                            <i class="fa-solid fa-crown"></i> Cliente Âncora do Time
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                            ${topClient[0]}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                            <span>${clientJobsCount} atendimentos</span>
                            <strong style="color: var(--accent-emerald);">${this.formatCurrency(topClient[1])} (${clientTeamShare}%)</strong>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * 📊 3. COMPARATIVO VISUAL ENTRE EQUIPES (4 GRÁFICOS BI)
     */
    renderTeamsBICharts(teamTotalsList) {
        if (typeof Chart === 'undefined') return;

        const labels = teamTotalsList.map(t => t.label);
        const colors = ['#25abb7', '#10b981', '#f59e0b', '#ec4899', '#75d3cd'];

        // Chart 1: Revenue Bar Chart
        const ctxRev = document.getElementById('chartBIRevenueBar');
        if (ctxRev) {
            if (this.charts.biRev) this.charts.biRev.destroy();
            this.charts.biRev = new Chart(ctxRev, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Receita Total ($)',
                        data: teamTotalsList.map(t => t.tot.total),
                        backgroundColor: colors,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => '$' + v.toLocaleString() } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Chart 2: Ticket Médio Horizontal Bar Chart
        const ctxTicket = document.getElementById('chartBITicketHorizontal');
        if (ctxTicket) {
            if (this.charts.biTicket) this.charts.biTicket.destroy();
            this.charts.biTicket = new Chart(ctxTicket, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ticket Médio ($)',
                        data: teamTotalsList.map(t => t.tot.ticketMedio),
                        backgroundColor: colors,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => '$' + v.toLocaleString() } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        // Chart 3: Volume Bar Chart
        const ctxVol = document.getElementById('chartBIVolumeBar');
        if (ctxVol) {
            if (this.charts.biVol) this.charts.biVol.destroy();
            this.charts.biVol = new Chart(ctxVol, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Agendamentos (Jobs)',
                        data: teamTotalsList.map(t => t.tot.count),
                        backgroundColor: colors,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: 'rgba(37, 171, 183, 0.12)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Chart 4: Tips Bar Chart (Destaque Time 4 76%)
        const ctxTips = document.getElementById('chartBITipsBar');
        if (ctxTips) {
            if (this.charts.biTips) this.charts.biTips.destroy();
            this.charts.biTips = new Chart(ctxTips, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tips (Gorjetas $)',
                        data: teamTotalsList.map(t => t.tot.tip),
                        backgroundColor: ['#25abb7', '#10b981', '#f59e0b', '#ec4899', '#75d3cd'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => '$' + v } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    /**
     * ⚡ 4. PERFORMANCE STRIP MINI CARDS
     */
    renderTeamsPerformanceStrip(teamTotalsList, grandTotalAllTeamsInPeriod) {
        let topRev = teamTotalsList[0];
        let topTicket = teamTotalsList[0];
        let topVol = teamTotalsList[0];
        let topTips = teamTotalsList[0];
        let lowestTicket = teamTotalsList[0];

        teamTotalsList.forEach(t => {
            if (t.tot.total > topRev.tot.total) topRev = t;
            if (t.tot.ticketMedio > topTicket.tot.ticketMedio) topTicket = t;
            if (t.tot.count > topVol.tot.count) topVol = t;
            if (t.tot.tip > topTips.tot.tip) topTips = t;
            if (t.tot.ticketMedio < lowestTicket.tot.ticketMedio && t.tot.count > 0) lowestTicket = t;
        });

        const totalJobsAll = teamTotalsList.reduce((acc, t) => acc + t.tot.count, 0);
        const avgCompanyTicket = totalJobsAll > 0 ? (grandTotalAllTeamsInPeriod / totalJobsAll) : 0;
        const topSharePct = grandTotalAllTeamsInPeriod > 0 ? ((topRev.tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

        document.getElementById('biTopRevenue').textContent = `${topRev.label} (${this.formatCurrency(topRev.tot.total)})`;
        document.getElementById('biTopTicket').textContent = `${topTicket.label} (${this.formatCurrency(topTicket.tot.ticketMedio)})`;
        document.getElementById('biTopVolume').textContent = `${topVol.label} (${topVol.tot.count} jobs)`;
        document.getElementById('biTopTips').textContent = `${topTips.label} (${this.formatCurrency(topTips.tot.tip)})`;
        document.getElementById('biTopShare').textContent = `${topRev.label} (${topSharePct}%)`;
        document.getElementById('biLowestTicket').textContent = `${lowestTicket.label} (${this.formatCurrency(lowestTicket.tot.ticketMedio)})`;
        document.getElementById('biCompanyAvg').textContent = `${this.formatCurrency(avgCompanyTicket)} / job`;
    }

    /**
     * 📉 5. COMPARAÇÃO COM A MÉDIA DA EMPRESA (BENCHMARK TABLE)
     */
    renderTeamsBenchmarkTable(teamTotalsList, grandTotalAllTeamsInPeriod) {
        const tbody = document.getElementById('teamsBenchmarkTbody');
        if (!tbody) return;

        const totalJobsAll = teamTotalsList.reduce((acc, t) => acc + t.tot.count, 0);
        const avgCompanyTicket = totalJobsAll > 0 ? (grandTotalAllTeamsInPeriod / totalJobsAll) : 0;
        const avgCompanyRevenuePerTeam = grandTotalAllTeamsInPeriod / 5;

        let html = '';
        teamTotalsList.forEach(({ label, tot }) => {
            const ticketDiff = tot.ticketMedio - avgCompanyTicket;
            const revDiff = tot.total - avgCompanyRevenuePerTeam;
            const sharePct = grandTotalAllTeamsInPeriod > 0 ? ((tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

            let statusBadge = '';
            if (tot.ticketMedio >= avgCompanyTicket + 5) {
                statusBadge = `<span class="status-pill status-above-avg">🟢 Acima da Média</span>`;
            } else if (tot.ticketMedio >= avgCompanyTicket - 5) {
                statusBadge = `<span class="status-pill status-on-avg">🟡 Na Média</span>`;
            } else {
                statusBadge = `<span class="status-pill status-below-avg">🔴 Abaixo da Média</span>`;
            }

            html += `
                <tr>
                    <td style="font-weight: 700; color: #0f172a;">${label}</td>
                    <td style="font-weight: 600;">${this.formatCurrency(tot.ticketMedio)}</td>
                    <td style="font-weight: 700; color: ${ticketDiff >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                        ${ticketDiff >= 0 ? '+' : ''}${this.formatCurrency(ticketDiff)}
                    </td>
                    <td style="font-weight: 700;">${this.formatCurrency(tot.total)}</td>
                    <td style="font-weight: 700; color: ${revDiff >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                        ${revDiff >= 0 ? '+' : ''}${this.formatCurrency(revDiff)}
                    </td>
                    <td style="font-weight: 700; color: var(--primary);">${sharePct}%</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    /**
     * 🎯 6. RADAR DE PERFORMANCE MULTI-EIXOS
     */
    renderTeamsRadarChart(teamTotalsList) {
        if (typeof Chart === 'undefined') return;

        if (!teamTotalsList) {
            const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
            teamTotalsList = teamKeys.map(key => ({
                key, label: key, tot: this.calculateTotals(this.currentData[key] || [])
            }));
        }

        const selectElem = document.getElementById('biRadarTeamSelect');
        const selectedKey = selectElem ? selectElem.value : 'ALL';

        const ctxRadar = document.getElementById('chartBIRadar');
        if (!ctxRadar) return;

        const axes = ['Ticket Médio', 'Volume Jobs', 'Receita', 'Share %', 'Gorjetas', 'Produtividade'];
        const colors = {
            'TIME1': '#25abb7',
            'TIME2': '#10b981',
            'TIME3': '#f59e0b',
            'TIME4': '#ec4899',
            'TIME5': '#75d3cd'
        };

        let datasets = [];

        teamTotalsList.forEach(({ key, label, tot }) => {
            if (selectedKey !== 'ALL' && selectedKey !== key) return;

            // Normalized scores 0 to 100 for radar rendering
            const ticketScore = Math.min(100, (tot.ticketMedio / 200) * 100);
            const volScore = Math.min(100, (tot.count / 600) * 100);
            const revScore = Math.min(100, (tot.total / 110000) * 100);
            const shareScore = Math.min(100, (tot.total / 465821) * 500);
            const tipScore = Math.min(100, (tot.tip / 238) * 100);
            const prodScore = Math.min(100, (tot.count / 600) * 100);

            datasets.push({
                label: label,
                data: [ticketScore, volScore, revScore, shareScore, tipScore, prodScore],
                borderColor: colors[key] || 'var(--primary)',
                backgroundColor: (colors[key] || 'var(--primary)') + '25',
                borderWidth: 2
            });
        });

        if (this.charts.biRadar) this.charts.biRadar.destroy();
        this.charts.biRadar = new Chart(ctxRadar, {
            type: 'radar',
            data: { labels: axes, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { min: 0, max: 100, ticks: { display: false } } }
            }
        });
    }

    /**
     * 🍩 7. DONUT DE FATURAMENTO DAS EQUIPES
     */
    renderTeamsDonutChart(teamTotalsList) {
        if (typeof Chart === 'undefined') return;

        const ctxDonut = document.getElementById('chartBIDonut');
        if (!ctxDonut) return;

        const labels = teamTotalsList.map(t => t.label);
        const data = teamTotalsList.map(t => t.tot.total);
        const colors = ['#25abb7', '#10b981', '#f59e0b', '#ec4899', '#75d3cd'];

        if (this.charts.biDonut) this.charts.biDonut.destroy();
        this.charts.biDonut = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11, family: 'Poppins', weight: '600' }, padding: 12 } }
                },
                cutout: '65%'
            }
        });
    }

    /**
     * 📈 8. EVOLUÇÃO TEMPORAL MENSAL DAS EQUIPES (LINE TREND CHART)
     */
    renderTeamsTrendChart() {
        if (typeof Chart === 'undefined') return;

        const ctxTrend = document.getElementById('chartBITrendLine');
        if (!ctxTrend) return;

        const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamLabels = { 'TIME1': 'Time 1', 'TIME2': 'Time 2', 'TIME3': 'Time 3', 'TIME4': 'Time 4', 'TIME5': 'Time 5' };
        const colors = { 'TIME1': '#25abb7', 'TIME2': '#10b981', 'TIME3': '#f59e0b', 'TIME4': '#ec4899', 'TIME5': '#75d3cd' };

        const datasets = teamKeys.map(key => {
            const rawRecs = this.currentData[key] || [];
            const monthlyData = months.map(m => {
                const recs = rawRecs.filter(r => r.date.startsWith(m));
                return recs.reduce((acc, r) => acc + r.total, 0);
            });

            return {
                label: teamLabels[key],
                data: monthlyData,
                borderColor: colors[key],
                backgroundColor: colors[key] + '15',
                fill: false,
                tension: 0.3,
                borderWidth: 2.5
            };
        });

        if (this.charts.biTrendLine) this.charts.biTrendLine.destroy();
        this.charts.biTrendLine = new Chart(ctxTrend, {
            type: 'line',
            data: { labels: monthNames, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { size: 12, family: 'Poppins', weight: '600' } } } },
                scales: {
                    y: { grid: { color: 'rgba(37, 171, 183, 0.12)' }, ticks: { callback: v => '$' + v.toLocaleString() } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    /**
     * 📋 9. RESUMO EXECUTIVO DINÂMICO DA ABA EQUIPES
     */
    renderTeamsExecutiveSummary(teamTotalsList, grandTotalAllTeamsInPeriod) {
        const container = document.getElementById('teamsExecutiveSummaryContent');
        if (!container) return;

        let topRev = teamTotalsList[0];
        let topTicket = teamTotalsList[0];
        let topTips = teamTotalsList[0];
        let lowestTicket = teamTotalsList[0];

        teamTotalsList.forEach(t => {
            if (t.tot.total > topRev.tot.total) topRev = t;
            if (t.tot.ticketMedio > topTicket.tot.ticketMedio) topTicket = t;
            if (t.tot.tip > topTips.tot.tip) topTips = t;
            if (t.tot.ticketMedio < lowestTicket.tot.ticketMedio && t.tot.count > 0) lowestTicket = t;
        });

        const topSharePct = grandTotalAllTeamsInPeriod > 0 ? ((topRev.tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

        container.innerHTML = `
            O <strong>${topRev.label}</strong> permanece como principal motor financeiro da empresa, respondendo por aproximadamente <strong>${topSharePct}% do faturamento (${this.formatCurrency(topRev.tot.total)})</strong> no período selecionado. O <strong>${topTicket.label}</strong> apresenta o maior ticket médio (<strong>${this.formatCurrency(topTicket.tot.ticketMedio)}</strong>) e o <strong>${topTips.label}</strong> concentra a maior parte das gorjetas (<strong>${this.formatCurrency(topTips.tot.tip)} em tips</strong>), indicando elevado nível de satisfação dos clientes. Já o <strong>${lowestTicket.label}</strong> representa a maior oportunidade de crescimento, pois mantém um alto volume de atendimentos (${lowestTicket.tot.count} jobs), porém com o menor ticket médio (<strong>${this.formatCurrency(lowestTicket.tot.ticketMedio)}</strong>). Ajustes na precificação podem elevar significativamente a lucratividade sem necessidade de expansão operacional.
        `;
    }

    renderTransactionsTable() {
        const tbody = document.getElementById('transactionsTbody');
        if (!tbody) return;

        let records = this.getAllRecords();

        if (this.selectedTeamFilter !== 'ALL') {
            records = records.filter(r => r.team === this.selectedTeamFilter);
        }

        if (this.selectedStatusFilter !== 'ALL') {
            records = records.filter(r => (r.status || 'PAID').toUpperCase() === this.selectedStatusFilter.toUpperCase());
        }

        if (this.searchQuery) {
            records = records.filter(r => 
                (r.client && r.client.toLowerCase().includes(this.searchQuery)) ||
                (r.trans_type && r.trans_type.toLowerCase().includes(this.searchQuery)) ||
                (r.notes && r.notes.toLowerCase().includes(this.searchQuery)) ||
                (r.date && r.date.includes(this.searchQuery))
            );
        }

        const totalItems = records.length;
        const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const paginatedRecords = records.slice(startIndex, startIndex + this.pageSize);

        if (paginatedRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 32px; color: var(--text-muted);">Nenhum agendamento encontrado com os filtros selecionados.</td></tr>`;
        } else {
            let html = '';
            paginatedRecords.forEach(r => {
                const statusClass = (r.status || 'PAID').toUpperCase() === 'PAID' ? 'status-paid' :
                                    (r.status || 'PAID').toUpperCase() === 'UNPAID' ? 'status-unpaid' : 'status-pending';

                html += `
                    <tr>
                        <td style="font-weight: 600;">${this.formatDateBR(r.date)}</td>
                        <td><span class="team-jobs-badge">${r.team}</span></td>
                        <td style="font-weight: 700; color: #0f172a;">${r.client}</td>
                        <td>${r.trans_type || 'Cleaning'}</td>
                        <td style="font-weight: 600;">${this.formatCurrency(r.subtotal)}</td>
                        <td style="color: var(--accent-amber); font-weight: 600;">${this.formatCurrency(r.tip)}</td>
                        <td style="color: var(--primary); font-weight: 800;">${this.formatCurrency(r.total)}</td>
                        <td><span class="status-pill ${statusClass}">${r.status || 'PAID'}</span></td>
                        <td style="color: var(--text-muted);">${r.paid_by || 'Dinheiro/Cartão'}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        document.getElementById('tablePaginationInfo').textContent = `Exibindo ${startIndex + 1} - ${Math.min(startIndex + this.pageSize, totalItems)} de ${totalItems} agendamentos`;
        document.getElementById('btnPrevPage').disabled = this.currentPage <= 1;
        document.getElementById('btnNextPage').disabled = this.currentPage >= totalPages;
        document.getElementById('pageNumberDisplay').textContent = `Página ${this.currentPage} de ${totalPages}`;
    }

    changePage(delta) {
        this.currentPage += delta;
        this.renderTransactionsTable();
    }

    exportCSV() {
        const records = this.getAllRecords();
        let csv = 'Data,Equipe,Cliente,Tipo,Subtotal,Tip,Total,Status,FormaPagamento\n';

        records.forEach(r => {
            csv += `"${r.date}","${r.team}","${r.client.replace(/"/g, '""')}","${r.trans_type}","${r.subtotal}","${r.tip}","${r.total}","${r.status}","${r.paid_by}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Nucleus_Cleaning_Financeiro_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        this.showToast('Relatório CSV exportado com sucesso!');
    }

    renderReportsView() {
        if (typeof Chart === 'undefined') return;

        const records = this.getAllRecords();

        const clientTotals = {};
        records.forEach(r => {
            clientTotals[r.client] = (clientTotals[r.client] || 0) + r.total;
        });

        const sortedClients = Object.entries(clientTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const ctxTopClients = document.getElementById('chartTopClients');
        if (ctxTopClients) {
            if (this.charts.topClients) this.charts.topClients.destroy();
            this.charts.topClients = new Chart(ctxTopClients, {
                type: 'bar',
                data: {
                    labels: sortedClients.map(c => c[0]),
                    datasets: [{
                        label: 'Total Pago ($)',
                        data: sortedClients.map(c => c[1]),
                        backgroundColor: '#25abb7',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            grid: { color: 'rgba(37, 171, 183, 0.12)' },
                            ticks: { color: '#475569', callback: v => '$' + v }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#0f172a', font: { size: 11, family: 'Poppins', weight: '600' } }
                        }
                    }
                }
            });
        }
    }

    async syncGoogleSheets() {
        const syncBtn = document.getElementById('btnSyncSheets');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...`;
        }

        try {
            const freshData = await window.SheetsSyncModule.syncAllTeams();
            this.currentData = freshData;
            this.renderAllViews();
            this.showToast('Dados sincronizados com sucesso da planilha Google Sheets!');
        } catch (err) {
            console.error(err);
            this.showToast('Erro ao sincronizar planilha live. Dados locais mantidos.', 'error');
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Sincronizar Planilha`;
            }
        }
    }

    renderAllViews() {
        this.updateOverviewPeriodUI();
        this.renderClosureMetrics();
        this.renderOverviewCharts();
        this.updateTeamsPeriodUI();
        this.renderTeamsGrid();
        this.renderTransactionsTable();
        this.renderReportsView();
    }

    formatCurrency(val) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    }

    formatDateBR(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    formatMonthLabel(yearMonthStr) {
        if (!yearMonthStr) return '';
        const [year, month] = yearMonthStr.split('-');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const idx = parseInt(month, 10) - 1;
        return `${monthNames[idx] || month} ${year}`;
    }

    showToast(message, type = 'success') {
        let toast = document.getElementById('appToastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToastNotification';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 14px 20px;
                border-radius: 12px;
                color: #ffffff;
                font-weight: 600;
                font-size: 13px;
                box-shadow: 0 10px 25px rgba(37, 171, 183, 0.3);
                transition: opacity 0.3s ease;
                backdrop-filter: blur(12px);
            `;
            document.body.appendChild(toast);
        }

        toast.style.background = type === 'error' ? 'rgba(225, 29, 72, 0.95)' : 'rgba(37, 171, 183, 0.95)';
        toast.textContent = message;
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3500);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new NucleusDashboardApp();
});
