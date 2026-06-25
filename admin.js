let globalData = null;
let secretCode = '';

async function login() {
    secretCode = document.getElementById('admin-code').value;
    if (!secretCode) return alert("Introduce el código");
    
    // Test the code by fetching and trying a dummy update, or just fetching data
    try {
        const response = await fetch('/api/bets');
        const data = await response.json();
        
        // Let's do a fast validation without modifying using a dummy request
        const valRes = await fetch('/api/admin/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: secretCode, action: 'validate' })
        });
        
        // Our server just checks the code. If action is invalid it still returns success but does nothing
        if (valRes.status === 403) {
            alert("Código incorrecto.");
            return;
        }

        globalData = data;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        renderAdmin();
    } catch (error) {
        console.error(error);
        alert("Error de conexión.");
    }
}

async function sendAdminRequest(payload) {
    payload.code = secretCode;
    const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (response.ok) {
        const result = await response.json();
        globalData = result.data; // Server returns updated data
        renderAdmin(); // Re-render
    } else {
        alert("Error en la operación. Revisa si el código sigue siendo válido.");
    }
}

function renderAdmin() {
    const container = document.getElementById('matches-admin-container');
    container.innerHTML = '';

    globalData.matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-admin-card';
        
        const hScore = match.finalHomeScore !== null ? match.finalHomeScore : '';
        const aScore = match.finalAwayScore !== null ? match.finalAwayScore : '';

        let betsTable = '<tr><td colspan="5" style="text-align:center; color:#888;">No hay apuestas</td></tr>';
        const matchBets = globalData.bets[match.id] || [];
        
        if (matchBets.length > 0) {
            betsTable = matchBets.map((bet, index) => `
                <tr>
                    <td>${bet.name}</td>
                    <td>${bet.email}</td>
                    <td><strong>${bet.homeScore} - ${bet.awayScore}</strong></td>
                    <td style="text-align: right;">
                        <button class="edit-btn" onclick="editBet(${match.id}, ${index}, '${bet.name}', '${bet.email}', ${bet.homeScore}, ${bet.awayScore})">✏️</button>
                        <button class="delete-btn" onclick="deleteBet(${match.id}, ${index}, '${bet.name}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

        card.innerHTML = `
            <div class="match-admin-header">
                <h2>${match.homeTeam} vs ${match.awayTeam} <span style="font-size:1rem; color:#888;">(${match.displayDate})</span></h2>
            </div>
            
            <div class="score-editor">
                <strong>Resultado Oficial:</strong>
                <input type="number" id="admin-home-${match.id}" value="${hScore}" placeholder="?">
                <span> - </span>
                <input type="number" id="admin-away-${match.id}" value="${aScore}" placeholder="?">
                <button class="admin-btn" onclick="saveScore(${match.id})">Guardar Resultado</button>
                <button onclick="clearScore(${match.id})" style="background:transparent; color:#666; border:1px solid #ccc;">Borrar</button>
            </div>

            <h3 style="margin-top: 2rem; color: #385b94;">Apuestas Registradas (${matchBets.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Pronóstico</th>
                        <th style="text-align: right;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${betsTable}
                </tbody>
            </table>
        `;
        
        container.appendChild(card);
    });
}

function saveScore(matchId) {
    const hInput = document.getElementById(`admin-home-${matchId}`).value;
    const aInput = document.getElementById(`admin-away-${matchId}`).value;
    
    sendAdminRequest({
        action: 'updateMatch',
        matchId: matchId,
        finalHomeScore: hInput,
        finalAwayScore: aInput
    });
}

function clearScore(matchId) {
    sendAdminRequest({
        action: 'updateMatch',
        matchId: matchId,
        finalHomeScore: null,
        finalAwayScore: null
    });
}

function deleteBet(matchId, betIndex, betName) {
    if (confirm(`¿Seguro que quieres borrar la apuesta de ${betName}?`)) {
        sendAdminRequest({
            action: 'deleteBet',
            matchId: matchId,
            betIndex: betIndex
        });
    }
}

function editBet(matchId, betIndex, oldName, oldEmail, oldHome, oldAway) {
    const newName = prompt("Editar Nombre:", oldName);
    if (newName === null) return;
    const newEmail = prompt("Editar Email:", oldEmail);
    if (newEmail === null) return;
    const newHome = prompt(`Goles de local:`, oldHome);
    if (newHome === null) return;
    const newAway = prompt(`Goles de visitante:`, oldAway);
    if (newAway === null) return;

    sendAdminRequest({
        action: 'editBet',
        matchId: matchId,
        betIndex: betIndex,
        newBet: {
            name: newName,
            email: newEmail,
            homeScore: parseInt(newHome),
            awayScore: parseInt(newAway)
        }
    });
}
