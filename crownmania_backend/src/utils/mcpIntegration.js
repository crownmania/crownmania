import axios from 'axios';
import { promises as fs } from 'fs';
import { watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPIntegration extends EventEmitter {
    constructor() {
        super();
        this.baseUrl = 'http://localhost:3001';
        this.changelogPath = join(__dirname, '../../changelog.txt');
        this.lastReadPosition = 0;
        this.setupWebSocket();
        this.setupFileWatcher();

        // Severity level icons
        this.severityIcons = {
            INFO: '',
            WARNING: '',
            ERROR: '',
            DEBUG: ''
        };
    }

    setupWebSocket() {
        try {
            this.wss = new WebSocketServer({ port: 3002 });
            
            this.wss.on('connection', (ws) => {
                console.log('Client connected to MCP WebSocket');
                
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        this.handleWebSocketMessage(ws, data);
                    } catch (err) {
                        console.error('Failed to parse WebSocket message:', err);
                    }
                });
                
                ws.on('close', () => {
                    console.log('Client disconnected from MCP WebSocket');
                });
            });

            console.log('MCP WebSocket server running on port 3002');
        } catch (err) {
            console.error('Failed to setup WebSocket server:', err);
            // Continue without WebSocket if it fails
        }
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                // Handle subscription requests
                break;
            case 'getErrors':
                this.fetchLocalErrors()
                    .then(errors => {
                        ws.send(JSON.stringify({
                            type: 'errors',
                            data: errors
                        }));
                    })
                    .catch(err => {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: err.message
                        }));
                    });
                break;
            default:
                console.warn('Unknown WebSocket message type:', data.type);
        }
    }

    setupFileWatcher() {
        try {
            watch(this.changelogPath, (eventType, filename) => {
                if (eventType === 'change') {
                    this.handleChangelogUpdate();
                }
            });
            console.log('Watching changelog.txt for changes');
        } catch (err) {
            console.error('Failed to setup file watcher:', err);
        }
    }

    // Format log entry with timestamp and severity
    formatLogEntry(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const icon = this.severityIcons[level.toUpperCase()] || '';
        const metadataStr = Object.keys(metadata).length 
            ? `\n  ${Object.entries(metadata)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n  ')}`
            : '';

        return `[${timestamp}] ${icon} ${level.toUpperCase()}: ${message}${metadataStr}\n`;
    }

    // Write to changelog with formatting
    async writeToChangelog(level, message, metadata = {}) {
        try {
            const entry = this.formatLogEntry(level, message, metadata);
            await fs.appendFile(this.changelogPath, entry);
            this.handleChangelogUpdate();
            return true;
        } catch (err) {
            console.error('Failed to write to changelog:', err);
            return false;
        }
    }

    // Parse log entry
    parseLogEntry(line) {
        const match = line.match(/\[(.*?)\] (| | | | ) (\w+): (.*?)(?:\n  (?:.*\n  )*)?$/);
        if (!match) return null;

        const [_, timestamp, icon, level, message] = match;
        const metadata = {};

        // Parse metadata if present
        const metadataLines = line.split('\n').slice(1);
        metadataLines.forEach(line => {
            const metaMatch = line.match(/^\s\s(\w+): (.+)$/);
            if (metaMatch) {
                const [_, key, value] = metaMatch;
                metadata[key] = value;
            }
        });

        return {
            timestamp,
            level,
            message,
            icon,
            metadata,
            source: 'changelog'
        };
    }

    async handleChangelogUpdate() {
        try {
            const newEntries = await this.fetchLocalErrors();
            if (newEntries.length > 0) {
                const message = {
                    type: 'newEntries',
                    data: newEntries
                };
                
                // Emit for local listeners
                this.emit('newEntries', newEntries);
                
                // Broadcast to all connected WebSocket clients
                if (this.wss) {
                    this.wss.clients.forEach(client => {
                        if (client.readyState === WebSocketServer.OPEN) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            }
        } catch (err) {
            await this.writeToChangelog('error', 'Error handling changelog update', {
                error: err.message
            });
        }
    }

    // Fetch errors from changelog.txt
    async fetchLocalErrors() {
        try {
            const fileContent = await fs.readFile(this.changelogPath, 'utf8');
            const lines = fileContent.split('\n\n')  // Split on double newline to separate entries
                .filter(entry => entry.trim().length > 0);
            
            // Parse each entry since last read
            const newEntries = lines
                .slice(this.lastReadPosition)
                .map(entry => this.parseLogEntry(entry))
                .filter(entry => entry !== null);

            this.lastReadPosition = lines.length;
            return newEntries;
        } catch (err) {
            if (err.code === 'ENOENT') {
                // Create the changelog file if it doesn't exist
                await fs.writeFile(this.changelogPath, '');
                return [];
            }
            throw err;
        }
    }

    // Fetch all errors from MCP server
    async fetchServerErrors() {
        try {
            const response = await axios.get(`${this.baseUrl}/report-error`);
            return response.data.map(error => ({
                ...error,
                source: 'server'
            }));
        } catch (err) {
            throw new Error(`Failed to fetch errors from MCP server: ${err.message}`);
        }
    }

    // Send code for linting
    async lintCode(code) {
        try {
            const response = await axios.post(`${this.baseUrl}/lint`, { code });
            const results = this.formatLintResults(response.data);
            
            // Log linting results to changelog
            if (results.type === 'success') {
                await this.writeToChangelog('info', 'Linting completed successfully', {
                    message: results.message
                });
            } else {
                await this.writeToChangelog('warning', 'Linting found issues', {
                    totalIssues: results.totalIssues,
                    details: `Found ${results.totalIssues} issue(s)`
                });
            }

            return results;
        } catch (err) {
            await this.writeToChangelog('error', 'Linting failed', {
                error: err.message
            });
            throw err;
        }
    }

    // Format lint results for display
    formatLintResults(results) {
        if (!results.issues || results.issues.length === 0) {
            return {
                type: 'success',
                message: ' No linting issues found!'
            };
        }

        return {
            type: 'issues',
            totalIssues: results.totalIssues,
            issues: results.issues.map(issue => ({
                severity: issue.severity,
                line: issue.line,
                column: issue.column,
                message: issue.message,
                ruleId: issue.ruleId
            }))
        };
    }

    // Start periodic error checking
    startErrorMonitoring(callback, interval = 30000) {
        setInterval(async () => {
            try {
                const newErrors = await this.fetchLocalErrors();
                if (newErrors.length > 0) {
                    callback(newErrors);
                }
            } catch (err) {
                console.error('Error monitoring failed:', err);
            }
        }, interval);
    }

    // Cleanup resources
    cleanup() {
        if (this.wss) {
            this.wss.close(() => {
                console.log('WebSocket server closed');
            });
        }
    }
}

// Create and export singleton instance
const mcpIntegration = new MCPIntegration();

// Handle process termination
process.on('SIGINT', () => {
    mcpIntegration.cleanup();
    process.exit(0);
});

export { MCPIntegration as default };
