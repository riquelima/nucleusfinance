/**
 * Nucleus Cleaning Services - Dashboard Application Engine
 * Manages SPA navigation, authentication, state, period closures, financial metrics, and charts.
 */

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

        // Period filter selections
        this.selectedDate = '2026-01-02'; // default sample date
        this.selectedMonth = '2026-01'; // YYYY-MM
        this.selectedYear = '2026';

        this.init();
    }

    init() {
        this.checkAuthSession();
        this.bindEvents();
        this.updatePeriodSelectors();
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

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Date / Period filters
        const dateInput = document.getElementById('filterDateInput');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.renderClosureMetrics();
            });
        }

        const monthInput = document.getElementById('filterMonthInput');
        if (monthInput) {
            monthInput.addEventListener('change', (e) => {
                this.selectedMonth = e.target.value;
                this.renderClosureMetrics();
            });
        }

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

    /**
     * SPA Horizontal Slider Navigation Switcher
     * [NO_PHYSICAL_REDIRECTS] & [SPA_HORIZONTAL_MANDATE]
     */
    switchTab(tabId) {
        if (!this.isAuthenticated && tabId !== 'login') {
            tabId = 'login';
        }

        this.activeTab = tabId;
        this.applySliderTransform(tabId);
        this.updateNavButtons(tabId);

        // Render tab specific components when active
        if (tabId === 'overview') {
            this.renderClosureMetrics();
            this.renderOverviewCharts();
        } else if (tabId === 'equipes') {
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
        
        // Hardware accelerated translate3d
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

    updatePeriodSelectors() {
        const allRecords = this.getAllRecords();
        if (allRecords.length === 0) return;

        const dateInput = document.getElementById('filterDateInput');
        if (dateInput && !dateInput.value) {
            dateInput.value = this.selectedDate;
        }

        const monthInput = document.getElementById('filterMonthInput');
        if (monthInput && !monthInput.value) {
            monthInput.value = this.selectedMonth;
        }
    }

    /**
     * Render Fechamento por Equipe & Período (Diário, Semanal, Mensal, Anual)
     */
    renderClosureMetrics() {
        const records = this.getAllRecords();

        // 1. Fechamento Diário
        const dailyRecords = records.filter(r => r.date === this.selectedDate);
        const dailyTot = this.calculateTotals(dailyRecords);
        this.updateClosureCard('daily', dailyTot, `Data: ${this.formatDateBR(this.selectedDate)}`);

        // 2. Fechamento Semanal
        const selDateObj = new Date(this.selectedDate);
        const dayOfWeek = selDateObj.getDay();
        const firstDayOfWeek = new Date(selDateObj);
        firstDayOfWeek.setDate(selDateObj.getDate() - dayOfWeek);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

        const startStr = firstDayOfWeek.toISOString().split('T')[0];
        const endStr = lastDayOfWeek.toISOString().split('T')[0];

        const weeklyRecords = records.filter(r => r.date >= startStr && r.date <= endStr);
        const weeklyTot = this.calculateTotals(weeklyRecords);
        this.updateClosureCard('weekly', weeklyTot, `Semana: ${this.formatDateBR(startStr)} - ${this.formatDateBR(endStr)}`);

        // 3. Fechamento Mensal
        const monthlyRecords = records.filter(r => r.date.startsWith(this.selectedMonth));
        const monthlyTot = this.calculateTotals(monthlyRecords);
        const monthLabel = this.formatMonthLabel(this.selectedMonth);
        this.updateClosureCard('monthly', monthlyTot, `Mês: ${monthLabel}`);

        // 4. Fechamento Anual
        const annualRecords = records.filter(r => r.date.startsWith(this.selectedYear));
        const annualTot = this.calculateTotals(annualRecords);
        this.updateClosureCard('annual', annualTot, `Ano: ${this.selectedYear}`);

        // Global KPI Cards
        const overall = this.calculateTotals(records);
        document.getElementById('kpiTotalFaturamento').textContent = this.formatCurrency(overall.total);
        document.getElementById('kpiTotalSubtotal').textContent = this.formatCurrency(overall.subtotal);
        document.getElementById('kpiTotalTip').textContent = this.formatCurrency(overall.tip);
        document.getElementById('kpiTotalAgendamentos').textContent = overall.count.toLocaleString('pt-BR');
        document.getElementById('kpiTicketMedio').textContent = this.formatCurrency(overall.ticketMedio);
    }

    updateClosureCard(type, totals, subtitle) {
        document.getElementById(`closure${type.charAt(0).toUpperCase() + type.slice(1)}Total`).textContent = this.formatCurrency(totals.total);
        document.getElementById(`closure${type.charAt(0).toUpperCase() + type.slice(1)}Subtotal`).textContent = this.formatCurrency(totals.subtotal);
        document.getElementById(`closure${type.charAt(0).toUpperCase() + type.slice(1)}Tip`).textContent = this.formatCurrency(totals.tip);
        document.getElementById(`closure${type.charAt(0).toUpperCase() + type.slice(1)}Count`).textContent = `${totals.count} serviços`;
        
        const subElem = document.getElementById(`closure${type.charAt(0).toUpperCase() + type.slice(1)}Subtitle`);
        if (subElem) subElem.textContent = subtitle;
    }

    /**
     * Render Overview Charts using Light Background Theme
     */
    renderOverviewCharts() {
        if (typeof Chart === 'undefined') return;

        const records = this.getAllRecords();

        // 1. Monthly Revenue Trend Line Chart
        const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const monthlyData = months.map(m => {
            const recs = records.filter(r => r.date.startsWith(m));
            return recs.reduce((acc, r) => acc + r.total, 0);
        });

        const ctxTrend = document.getElementById('chartRevenueTrend');
        if (ctxTrend) {
            if (this.charts.trend) this.charts.trend.destroy();
            this.charts.trend = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: monthNames,
                    datasets: [{
                        label: 'Faturamento Total ($)',
                        data: monthlyData,
                        borderColor: '#25abb7',
                        backgroundColor: 'rgba(37, 171, 183, 0.15)',
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#25abb7',
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
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

        // 2. Team Comparison Doughnut Chart
        const teamNames = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamColors = ['#25abb7', '#10b981', '#f59e0b', '#ec4899', '#75d3cd'];
        const teamTotals = teamNames.map(t => {
            const recs = this.currentData[t] || [];
            return recs.reduce((acc, r) => acc + r.total, 0);
        });

        const ctxTeam = document.getElementById('chartTeamComparison');
        if (ctxTeam) {
            if (this.charts.team) this.charts.team.destroy();
            this.charts.team = new Chart(ctxTeam, {
                type: 'doughnut',
                data: {
                    labels: ['Time 1', 'Time 2', 'Time 3', 'Time 4', 'Time 5'],
                    datasets: [{
                        data: teamTotals,
                        backgroundColor: teamColors,
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
                            labels: { color: '#0f172a', padding: 16, font: { size: 12, family: 'Poppins', weight: '600' } }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    /**
     * Render Tab Equipes
     */
    renderTeamsGrid() {
        const teamsContainer = document.getElementById('teamsGridContainer');
        if (!teamsContainer) return;

        const teamKeys = ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'];
        const teamLabels = { 'TIME1': 'Time 1', 'TIME2': 'Time 2', 'TIME3': 'Time 3', 'TIME4': 'Time 4', 'TIME5': 'Time 5' };
        const teamClasses = { 'TIME1': 'team-1', 'TIME2': 'team-2', 'TIME3': 'team-3', 'TIME4': 'team-4', 'TIME5': 'team-5' };

        let html = '';
        teamKeys.forEach(key => {
            const recs = this.currentData[key] || [];
            const tot = this.calculateTotals(recs);

            html += `
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

        teamsContainer.innerHTML = html;
    }

    /**
     * Render Transactions Table
     */
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
        this.renderClosureMetrics();
        this.renderOverviewCharts();
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
