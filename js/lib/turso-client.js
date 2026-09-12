/**
 * Turso (libSQL) HTTP Client for Browser
 * Direct browser-to-Turso communication via libSQL HTTP API
 * No backend needed - works on Vercel, Netlify, GitHub Pages, etc.
 */

class TursoClient {
    constructor(databaseUrl, authToken = '') {
        this.databaseUrl = databaseUrl.replace(/\/+$/, '');
        this.authToken = authToken;
        
        // Normalize to HTTP API endpoint
        // libsql://xxx.turso.io -> https://xxx.turso.io/v2/pipeline
        if (this.databaseUrl.startsWith('libsql://')) {
            this.baseUrl = 'https://' + this.databaseUrl.slice(9) + '/v2/pipeline';
        } else if (this.databaseUrl.startsWith('http')) {
            this.baseUrl = this.databaseUrl.replace(/\/+$/, '') + '/v2/pipeline';
        } else {
            this.baseUrl = 'https://' + this.databaseUrl + '/v2/pipeline';
        }
        
        this.timeout = 10000;
    }

    setTimeout(ms) {
        this.timeout = ms;
        return this;
    }

    async _request(payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Turso HTTP ${response.status}: ${text}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Turso error: ${data.error}`);
            }

            return data;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Turso request timeout');
            }
            throw err;
        }
    }

    _parseRows(result) {
        if (!result.rows || !result.cols) return [];
        const cols = result.cols;
        return result.rows.map(row => {
            const obj = {};
            cols.forEach((col, i) => { obj[col] = row[i] ?? null; });
            return obj;
        });
    }

    // ========== High-level methods ==========

    async execute(sql, args = []) {
        const data = await this._request({
            requests: [{ type: 'execute', stmt: { sql, args } }]
        });
        return data.results?.[0] ?? { results: [] };
    }

    async batch(statements) {
        const data = await this._request({
            requests: statements.map(s => ({
                type: 'execute',
                stmt: { sql: s.sql, args: s.args ?? [] }
            }))
        });
        return data.results ?? [];
    }

    async query(sql, args = []) {
        const result = await this.execute(sql, args);
        return this._parseRows(result);
    }

    async fetch(sql, args = []) {
        const rows = await this.query(sql, args);
        return rows[0] ?? null;
    }

    async insert(sql, args = []) {
        const result = await this.execute(sql, args);
        return Number(result.last_insert_rowid ?? 0);
    }

    async exec(sql, args = []) {
        const result = await this.execute(sql, args);
        return Number(result.rows_affected ?? 0);
    }

    async transaction(statements) {
        const requests = [
            { type: 'execute', stmt: { sql: 'BEGIN TRANSACTION', args: [] }},
            ...statements.map(s => ({ type: 'execute', stmt: { sql: s.sql, args: s.args ?? [] }})),
            { type: 'execute', stmt: { sql: 'COMMIT', args: [] }}
        ];
        
        const data = await this._request({ requests });
        
        if (data.error) {
            // Attempt rollback
            await this._request({ 
                requests: [{ type: 'execute', stmt: { sql: 'ROLLBACK', args: [] }}] 
            }).catch(() => {});
            throw new Error(`Transaction failed: ${data.error}`);
        }
        
        // Remove BEGIN/COMMIT results
        return (data.results ?? []).slice(1, -1);
    }

    // ========== PDO-like compatibility ==========
    
    prepare(sql) {
        return new TursoStatement(this, sql);
    }
}

class TursoStatement {
    constructor(client, sql) {
        this.client = client;
        this.sql = sql;
        this.params = [];
    }

    async execute(params = []) {
        this.params = params;
        try {
            await this.client.execute(this.sql, params);
            return true;
        } catch {
            return false;
        }
    }

    async fetchAll() {
        return this.client.query(this.sql, this.params);
    }

    async fetch() {
        return this.client.fetch(this.sql, this.params);
    }

    async fetchColumn(column = 0) {
        const row = await this.client.query(this.sql, this.params);
        return row[0]?.[column] ?? null;
    }

    async rowCount() {
        const rows = await this.fetchAll();
        return rows.length;
    }
}

// Export for ES modules and global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TursoClient, TursoStatement };
}
if (typeof window !== 'undefined') {
    window.TursoClient = TursoClient;
    window.TursoStatement = TursoStatement;
}