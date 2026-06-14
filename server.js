const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'apuestas.json');

// Inicializar apuestas.json si no existe
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        pot: 0,
        matches: [
            {
                id: 1,
                homeTeam: "España",
                awayTeam: "Cabo Verde",
                date: "2026-06-15T18:00:00+02:00",
                displayDate: "Lunes 15, 18:00",
                shortDate: "15 Jun",
                finalHomeScore: null,
                finalAwayScore: null
            },
            {
                id: 2,
                homeTeam: "España",
                awayTeam: "Arabia Saudita",
                date: "2026-06-21T18:00:00+02:00",
                displayDate: "Domingo 21, 18:00",
                shortDate: "21 Jun",
                finalHomeScore: null,
                finalAwayScore: null
            },
            {
                id: 3,
                homeTeam: "Uruguay",
                awayTeam: "España",
                date: "2026-06-27T02:00:00+02:00",
                displayDate: "Sábado 27, 02:00",
                shortDate: "27 Jun",
                finalHomeScore: null,
                finalAwayScore: null
            }
        ],
        bets: {
            "1": [],
            "2": [],
            "3": []
        }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    // API endpoints
    if (req.url === '/api/bets' && req.method === 'GET') {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Error reading data' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
        return;
    }

    if (req.url === '/api/bets' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newBetInfo = JSON.parse(body);
                const { matchId, bet } = newBetInfo;
                
                const dataStr = fs.readFileSync(DATA_FILE, 'utf8');
                const data = JSON.parse(dataStr);
                
                if (!data.bets[matchId]) {
                    data.bets[matchId] = [];
                }
                
                // Añadir la nueva apuesta
                data.bets[matchId].push(bet);
                
                // Guardar en el archivo JSON
                fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: data }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Endpoint de administrador
    if (req.url === '/api/admin/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                
                // CÓDIGO SECRETO (puedes cambiarlo si quieres)
                if (payload.code !== 'admin123') {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Código incorrecto' }));
                }

                const dataStr = fs.readFileSync(DATA_FILE, 'utf8');
                const data = JSON.parse(dataStr);
                
                if (payload.action === 'updateMatch') {
                    const match = data.matches.find(m => m.id === payload.matchId);
                    if (match) {
                        match.finalHomeScore = payload.finalHomeScore === '' || payload.finalHomeScore === null ? null : parseInt(payload.finalHomeScore);
                        match.finalAwayScore = payload.finalAwayScore === '' || payload.finalAwayScore === null ? null : parseInt(payload.finalAwayScore);
                    }
                } else if (payload.action === 'deleteBet') {
                    if (data.bets[payload.matchId]) {
                        data.bets[payload.matchId].splice(payload.betIndex, 1);
                    }
                } else if (payload.action === 'editBet') {
                    if (data.bets[payload.matchId] && data.bets[payload.matchId][payload.betIndex]) {
                        data.bets[payload.matchId][payload.betIndex] = payload.newBet;
                    }
                }

                fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: data }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Servir archivos estáticos (HTML, CSS, JS)
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Servidor de la Porra iniciado correctamente`);
    console.log(`=================================================`);
    console.log(`📍 Web pública: http://localhost:${PORT}`);
    console.log(`🔐 Panel Admin: http://localhost:${PORT}/admin.html`);
    console.log(`=================================================\n`);
});
