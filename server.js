import express from 'express';
import fs from 'fs';
import path from 'path';
import { runAutomation } from './automation.js';

const app = express();
const PORT = process.env.PORT || 3000;

const logsFile = path.resolve('./logs.json');

function loadLogs() {
  if (!fs.existsSync(logsFile)) return [];
  return JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
}

function saveLog(entry) {
  const logs = loadLogs();
  logs.unshift(entry);
  fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  const logs = loadLogs();

  res.send(`
    <html>
    <head>
      <title>Almare Automation Dashboard</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        button { padding: 10px 16px; margin-right: 10px; cursor: pointer; }
        table { border-collapse: collapse; margin-top: 20px; width: 100%; background: #fff; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #222; color: #fff; }
        .SUCCESS { color: green; font-weight: bold; }
        .FAILURE { color: red; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Almare Automation Dashboard</h1>
      <button onclick="location.href='/run'">Run Automation</button>
      <button onclick="location.href='/logs'">View Logs</button>

      <table>
        <tr>
          <th>Time</th>
          <th>Status</th>
          <th>Rows</th>
          <th>File</th>
          <th>Duration (ms)</th>
        </tr>
        ${logs.map(l => `
          <tr>
            <td>${l.time}</td>
            <td class="${l.status}">${l.status}</td>
            <td>${l.rows ?? '-'}</td>
            <td>${l.file ?? '-'}</td>
            <td>${l.durationMs ?? '-'}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `);
});

app.get('/run', async (req, res) => {
  const start = new Date();

  try {
    const result = await runAutomation();

    const log = {
      time: start.toISOString(),
      status: 'SUCCESS',
      rows: result.data.length,
      file: result.filePath,
      durationMs: result.durationMs,
      steps: result.logs
    };

    saveLog(log);
    res.json(log);

  } catch (err) {
    console.error('Automation error:', err);

    const log = {
      time: start.toISOString(),
      status: 'FAILURE',
      error: err.message,
      steps: err.logs || []
    };

    saveLog(log);
    res.status(500).json(log);
  }
});

app.get('/logs', (req, res) => {
  res.json(loadLogs());
});

app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
