/**
 * Nucleus Cleaning Services - Google Sheets Live Sync Module
 * Synchronizes database directly from Google Sheets GViz endpoint
 */

window.SheetsSyncModule = {
    SPREADSHEET_ID: '1WuwFpLmklVJTfI4xDKRzdXZw2-zJ40lcDfpzyG1D8Mc',
    TEAMS: ['TIME1', 'TIME2', 'TIME3', 'TIME4', 'TIME5'],

    /**
     * Helper to safely parse numeric value from sheet cell
     */
    parseNumber(cell) {
        if (!cell) return 0.0;
        const v = cell.v;
        if (typeof v === 'number') return v;
        if (!v) return 0.0;
        try {
            const cleaned = String(v).replace(/\$/g, '').replace(/,/g, '').trim();
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0.0 : num;
        } catch (e) {
            return 0.0;
        }
    },

    /**
     * Helper to parse Google GViz date string e.g. "Date(2026,0,2)"
     */
    parseDate(raw) {
        if (!raw) return "";
        if (typeof raw === 'string' && raw.startsWith('Date(')) {
            const matches = raw.match(/\d+/g);
            if (matches && matches.length >= 3) {
                const year = parseInt(matches[0], 10);
                const month = parseInt(matches[1], 10) + 1; // 0-indexed in JS Date
                const day = parseInt(matches[2], 10);
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        return String(raw).trim();
    },

    /**
     * Fetch a single team sheet tab
     */
    async fetchTeamSheet(teamName) {
        const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(teamName)}`;
        const response = await fetch(url);
        const text = await response.text();
        
        // Match google.visualization.Query.setResponse({...});
        const match = text.match(/setResponse\((.*)\);/s);
        if (!match) {
            throw new Error(`Resposta inválida para a aba ${teamName}`);
        }

        const data = JSON.parse(match[1]);
        const rows = data.table.rows || [];
        const records = [];

        for (const row of rows) {
            const cells = row.c || [];
            if (cells.length === 0) continue;

            const dateStr = this.parseDate(cells[0] ? cells[0].v : null);
            if (!dateStr) continue;

            const trans_type = cells[1] && cells[1].v ? String(cells[1].v).trim() : "";
            const client = cells[2] && cells[2].v ? String(cells[2].v).trim() : "";
            const description = cells[3] && cells[3].v ? String(cells[3].v).trim() : "";
            const state = cells[4] && cells[4].v ? String(cells[4].v).trim() : "NJ";
            const status = cells[5] && cells[5].v ? String(cells[5].v).trim() : "PAID";

            const subtotal = this.parseNumber(cells[6]);
            const tax = this.parseNumber(cells[8]);
            const tip = this.parseNumber(cells[9]);
            const fee = this.parseNumber(cells[10]);
            const total = this.parseNumber(cells[11]);
            const paid_by = cells[12] && cells[12].v ? String(cells[12].v).trim() : "";
            const notes = cells[13] && cells[13].v ? String(cells[13].v).trim() : "";

            if (dateStr && (subtotal > 0 || total > 0 || client)) {
                records.push({
                    date: dateStr,
                    trans_type: trans_type || "Cleaning",
                    client: client || "Cliente Não Informado",
                    description,
                    state,
                    status: status || "PAID",
                    subtotal,
                    tax,
                    tip,
                    fee,
                    total: total || (subtotal + tip),
                    paid_by,
                    notes
                });
            }
        }
        return records;
    },

    /**
     * Fetch all team sheets in parallel and return object { TIME1: [], TIME2: [], ... }
     */
    async syncAllTeams() {
        console.log("Iniciando sincronização com o Google Sheets...");
        const resultData = {};
        
        const promises = this.TEAMS.map(team => 
            this.fetchTeamSheet(team)
                .then(recs => {
                    resultData[team] = recs;
                    console.log(`✓ Sync ${team}: ${recs.length} agendamentos.`);
                })
                .catch(err => {
                    console.warn(`Erro ao sincronizar ${team}:`, err);
                    // Fallback to initial local dataset if network request fails
                    if (window.INITIAL_SHEET_DATA && window.INITIAL_SHEET_DATA[team]) {
                        resultData[team] = window.INITIAL_SHEET_DATA[team];
                    } else {
                        resultData[team] = [];
                    }
                })
        );

        await Promise.all(promises);
        return resultData;
    }
};
