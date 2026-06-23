const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const HTTP_PORT = 8080;
const WS_PORT = 9998; // Porta para WebSockets
const AUTH_COOKIE_NAME = 'aimlock_auth';
const AUTH_PASSWORD = 'ayres';

// Servidor WebSocket
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
    console.log(`[WebSocket] Servidor ativo na porta: ${WS_PORT}`);
});

// Clientes conectados (Android e/ou Painel Web)
const clients = new Map(); // Armazena { id: ws_connection }

// --- Funções de Lógica do Cheat (Simuladas) ---
function calculateAimAdjustment(gameData) {
    if (!gameData || !gameData.payload || !gameData.payload.enemies || gameData.payload.enemies.length === 0) {
        return null; // Sem inimigos, sem ajuste
    }

    const enemy = gameData.payload.enemies[0];
    const neckOffsetFactor = gameData.payload.settings?.neckShotFactor || 0.05;

    console.log(`Calculando ajuste para inimigo ID: ${enemy.id}`);

    const adjustment = {
        pitch: (Math.random() - 0.5) * 0.05,
        yaw: (Math.random() - 0.5) * 0.1
    };

    adjustment.pitch += neckOffsetFactor * (Math.random() > 0.5 ? 1 : -1);
    return adjustment;
}

// --- Gerenciamento de Conexões WebSocket ---
wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    clients.set(clientId, ws);
    console.log(`[WebSocket] Cliente conectado: ${clientId}`);

    ws.send(JSON.stringify({ type: 'clientId', id: clientId }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`[WebSocket] Mensagem recebida de ${clientId} (${data.type}):`, data);

            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'latency', value: 5 }));
                    break;

                case 'gameData': {
                    const adjustment = calculateAimAdjustment(data);
                    if (adjustment && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'aimAdjustment',
                            payload: adjustment
                        }));
                    }
                    break;
                }

                case 'statusUpdate':
                    console.log(`[WebSocket] Status update de ${clientId}: ${data.payload.status}`);
                    broadcastToWebPanels({ type: 'clientStatus', clientId: clientId, status: data.payload.status });
                    break;

                case 'controlCommand':
                    console.log(`[WebSocket] Comando de controle de ${clientId}: ${data.payload.command}`);
                    break;

                default:
                    console.log(`[WebSocket] Tipo de mensagem desconhecido de ${clientId}: ${data.type}`);
            }
        } catch (e) {
            console.error(`[WebSocket] Erro processando mensagem de ${clientId}:`, e);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`[WebSocket] Cliente desconectado: ${clientId}`);
        broadcastToWebPanels({ type: 'clientDisconnected', clientId: clientId });
    });

    ws.on('error', (error) => {
        console.error(`[WebSocket] Erro no cliente ${clientId}:`, error);
        clients.delete(clientId);
        broadcastToWebPanels({ type: 'clientError', clientId: clientId, error: error.message });
    });
});

function broadcastToWebPanels(message) {
    const messageString = JSON.stringify(message);
    clients.forEach((clientWs, id) => {
        if (id.startsWith('client_') && !id.includes('_android_')) {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(messageString);
            }
        }
    });
}

function parseCookies(req) {
    const header = req.headers.cookie || '';
    return header.split(';').reduce((cookies, pair) => {
        const [name, ...rest] = pair.trim().split('=');
        if (!name) return cookies;
        cookies[name] = rest.join('=');
        return cookies;
    }, {});
}

function isAuthenticated(req) {
    const cookies = parseCookies(req);
    return cookies[AUTH_COOKIE_NAME] === '1';
}

function authMiddleware(req, res, next) {
    if (isAuthenticated(req)) {
        return next();
    }
    if (req.path.startsWith('/api') || req.path === '/proxy') {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    return res.redirect('/');
}

app.use(express.json());

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === AUTH_PASSWORD) {
        res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=1; HttpOnly; Path=/; Max-Age=86400`);
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Senha incorreta' });
});

app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
    return res.redirect('/');
});

app.get('/', (req, res) => {
    if (isAuthenticated(req)) {
        return res.redirect('/dashboard');
    }
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/command', authMiddleware, (req, res) => {
    const { command, payload } = req.body;
    console.log(`[HTTP API] Recebido comando: ${command}`, payload);

    if (command === 'broadcastEnableCheat') {
        const message = JSON.stringify({
            type: 'controlCommand',
            payload: { command: 'enableCheat', settings: payload?.settings || {} }
        });
        broadcastToAndroidClients(message);
        res.status(200).json({ success: true, message: 'Cheat enabled command broadcasted.' });
    } else {
        res.status(400).json({ success: false, message: 'Unknown command or invalid payload.' });
    }
});

function broadcastToAndroidClients(message) {
    const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
    clients.forEach((clientWs, id) => {
        if (id.includes('_android_')) {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(messageString);
                console.log(`[WebSocket] Enviado para cliente Android ${id}: ${messageString}`);
            }
        }
    });
}

app.post('/proxy', authMiddleware, async (req, res) => {
    const { targetUrl, method = 'GET', headers = {}, body } = req.body;
    if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ success: false, message: 'targetUrl is required' });
    }

    try {
        const response = await fetch(targetUrl, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const responseBody = await response.text();
        return res.json({
            success: true,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🌐 Servidor HTTP ativo! Acesse: http://localhost:${HTTP_PORT}`);
    console.log(`🚀 Servidor WebSocket ativo! Porta: ${WS_PORT}`);
    console.log(`======================================================\n`);
});
