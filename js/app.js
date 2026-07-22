/**
 * Nucleus Cleaning Services - Dashboard Application Engine
 * Manages SPA navigation, authentication, state, period closures, DRE, financial metrics, and custom Flatpickr calendar instances.
 */

// Audit Dataset for Expenses (Aba Despesas)
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

        // Overview Tab Period Mode (Dia, Semana, Mês, Anual)
        this.overviewPeriodMode = 'annual'; // 'daily', 'weekly', 'monthly', 'annual'
        this.overviewSelectedDate = '2026-01-02';
        this.overviewSelectedMonth = '2026-01';

        // Teams Tab Period Mode (Dia, Semana, Mês, Anual)
        this.teamsPeriodMode = 'annual';
        this.teamsSelectedDate = '2026-01-02';
        this.teamsSelectedMonth = '2026-01';

        // Flatpickr instances
        this.flatpickrs = {};

        this.init();
    }

    init() {
        this.checkAuthSession();
        this.initFlatpickrs();
        this.bindEvents();
        this.renderAllViews();
        
        // Handle URL params tab if specified
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

        // 1. Overview Datepicker
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

        // 2. Overview Monthpicker (Flatpickr MonthSelect Plugin if available)
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

        // 3. Teams Datepicker
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

        // 4. Teams Monthpicker
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
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Overview Period Mode Toggle Buttons (Dia, Semana, Mês, Anual)
        const ovModeBtns = document.querySelectorAll('.overview-mode-btn');
        ovModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                ovModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.overviewPeriodMode = btn.getAttribute('data-mode');
                this.updateOverviewPeriodUI();
                this.renderClosureMetrics();
            });
        });

        // Teams Period Mode Toggle Buttons
        const teamModeBtns = document.querySelectorAll('.period-mode-btn');
        teamModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                teamModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.teamsPeriodMode = btn.getAttribute('data-mode');
                this.updateTeamsPeriodUI();
                this.renderTeamsGrid();
            });
        });

        // Team filter in transactions
        const teamFilter = document.getElementById('tableTeamFilter');
        if (teamFilter) {
            teamFilter.addEventListener('change', (e) => {
                this.selectedTeamFilter = e.target.value;
                this.currentPage = 1;
                this.renderTransactionsTable();
            });
        }

        // Status filter in transactions
        const statusFilter = document.getElementById('tableStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.selectedStatusFilter = e.target.value;
                this.currentPage = 1;
                this.renderTransactionsTable();
            });
        }

        // Search input in transactions
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
            expText = `Pro-rata Semanal: $${(DESPESAS_MONTHLY_TOTAL / 30 * 7).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else if (this.overviewPeriodMode === 'monthly') {
            if (dateInputContainer) dateInputContainer.style.display = 'none';
            if (monthInputContainer) monthInputContainer.style.display = 'flex';
            labelText = `Mês: ${this.formatMonthLabel(this.overviewSelectedMonth)}`;
            expText = `Mensal: $31.457,28`;
        } else {
            // annual
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
            // annual
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
        let expPayroll = 0;
        let expFrota = 0;
        let expMarketing = 0;
        let expTech = 0;
        let expOps = 0;

        if (this.overviewPeriodMode === 'daily') {
            filteredRecords = allRecords.filter(r => r.date === this.overviewSelectedDate);
            expTotal = DESPESAS_MONTHLY_TOTAL / 30;
            expPayroll = DESPESAS_CATEGORIES_MONTHLY.payroll / 30;
            expFrota = DESPESAS_CATEGORIES_MONTHLY.frota / 30;
            expMarketing = DESPESAS_CATEGORIES_MONTHLY.marketing / 30;
            expTech = DESPESAS_CATEGORIES_MONTHLY.tech / 30;
            expOps = DESPESAS_CATEGORIES_MONTHLY.ops / 30;
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
            expTotal = (DESPESAS_MONTHLY_TOTAL / 30) * 7;
            expPayroll = (DESPESAS_CATEGORIES_MONTHLY.payroll / 30) * 7;
            expFrota = (DESPESAS_CATEGORIES_MONTHLY.frota / 30) * 7;
            expMarketing = (DESPESAS_CATEGORIES_MONTHLY.marketing / 30) * 7;
            expTech = (DESPESAS_CATEGORIES_MONTHLY.tech / 30) * 7;
            expOps = (DESPESAS_CATEGORIES_MONTHLY.ops / 30) * 7;
        } else if (this.overviewPeriodMode === 'monthly') {
            filteredRecords = allRecords.filter(r => r.date.startsWith(this.overviewSelectedMonth));
            expTotal = DESPESAS_MONTHLY_TOTAL;
            expPayroll = DESPESAS_CATEGORIES_MONTHLY.payroll;
            expFrota = DESPESAS_CATEGORIES_MONTHLY.frota;
            expMarketing = DESPESAS_CATEGORIES_MONTHLY.marketing;
            expTech = DESPESAS_CATEGORIES_MONTHLY.tech;
            expOps = DESPESAS_CATEGORIES_MONTHLY.ops;
        } else {
            // annual
            filteredRecords = allRecords.filter(r => r.date.startsWith('2026'));
            expTotal = DESPESAS_ANNUAL_TOTAL;
            expPayroll = DESPESAS_CATEGORIES_MONTHLY.payroll * 12;
            expFrota = DESPESAS_CATEGORIES_MONTHLY.frota * 12;
            expMarketing = DESPESAS_CATEGORIES_MONTHLY.marketing * 12;
            expTech = DESPESAS_CATEGORIES_MONTHLY.tech * 12;
            expOps = DESPESAS_CATEGORIES_MONTHLY.ops * 12;
        }

        const totals = this.calculateTotals(filteredRecords);
        const lucroLiquido = totals.total - expTotal;
        const margemLucroPct = totals.total > 0 ? ((lucroLiquido / totals.total) * 100).toFixed(1) : '0.0';
        const despesasPct = totals.total > 0 ? ((expTotal / totals.total) * 100).toFixed(1) : '0.0';

        // Update Overview KPI Elements
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

        document.getElementById('ovTicketMedio').textContent = this.formatCurrency(totals.ticketMedio);
        document.getElementById('ovAgendamentos').textContent = totals.count.toLocaleString('pt-BR');

        // Update Expense Breakdown Panel values
        document.getElementById('expPayrollVal').textContent = this.formatCurrency(expPayroll);
        document.getElementById('expFrotaVal').textContent = this.formatCurrency(expFrota);
        document.getElementById('expMarketingVal').textContent = this.formatCurrency(expMarketing);
        document.getElementById('expTechVal').textContent = this.formatCurrency(expTech);
        document.getElementById('expOpsVal').textContent = this.formatCurrency(expOps);
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

        // Chart 1: Revenue vs Expenses Dual Bar/Line Chart
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

        // Chart 2: Center of Cost Distribution Doughnut Chart
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

    /**
     * Render Tab Equipes with Period Selection (Dia, Semana, Mês, Consolidação Anual)
     */
    renderTeamsGrid() {
        const teamsContainer = document.getElementById('teamsGridContainer');
        const comparativeTbody = document.getElementById('teamsComparativeTbody');
        if (!teamsContainer) return;

        const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamLabels = { 'TIME1': 'Time 1', 'TIME2': 'Time 2', 'TIME3': 'Time 3', 'TIME4': 'Time 4', 'TIME5': 'Time 5' };
        const teamClasses = { 'TIME1': 'team-1', 'TIME2': 'team-2', 'TIME3': 'team-3', 'TIME4': 'team-4', 'TIME5': 'team-5' };

        // Calculate team records based on teamsPeriodMode
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
                // annual
                filteredRecs = rawRecs.filter(r => r.date.startsWith('2026'));
            }

            const tot = this.calculateTotals(filteredRecs);
            grandTotalAllTeamsInPeriod += tot.total;
            teamTotalsList.push({ key, tot, filteredRecs });
        });

        // 1. Render Team Cards
        let cardsHtml = '';
        teamTotalsList.forEach(({ key, tot }) => {
            cardsHtml += `
                <div class="team-card glass-panel animate-fade-in">
                    <div class="team-card-header">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="team-avatar ${teamClasses[key]}">
                                T${key.replace('TIME', '')}
                            </div>
                            <div>
                                <h3 class="team-name">${teamLabels[key]}</h3>
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

        // 2. Render Teams Comparative Summary Table
        if (comparativeTbody) {
            let tableHtml = '';
            teamTotalsList.forEach(({ key, tot }) => {
                const sharePct = grandTotalAllTeamsInPeriod > 0 ? ((tot.total / grandTotalAllTeamsInPeriod) * 100).toFixed(1) : '0.0';

                tableHtml += `
                    <tr>
                        <td style="font-weight: 700;">
                            <span class="team-jobs-badge">${teamLabels[key]}</span>
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

            // Total Summary Footer Row
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
