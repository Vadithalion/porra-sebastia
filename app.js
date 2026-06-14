// Estado de la aplicación
let matches = [];
let bets = {};
let previousPot = 0;

// Cargar datos desde el servidor en lugar de localStorage
async function loadData() {
    try {
        const response = await fetch('/api/bets');
        const data = await response.json();
        if (data && data.matches) {
            matches = data.matches;
            bets = data.bets || {};
            previousPot = data.pot || 0;
            renderSidebar();
            renderMatches();
            updatePotDisplay();
        }
    } catch (error) {
        console.error("Error al cargar los datos del servidor:", error);
        alert("No se pudieron cargar las apuestas del servidor. Comprueba la conexión.");
    }
}

function updatePotDisplay() {
    let currentBetsCount = 0;
    for (let matchId in bets) {
        currentBetsCount += bets[matchId].length;
    }
    const totalPot = previousPot + currentBetsCount; // 1€ por apuesta
    document.getElementById('total-pot').textContent = totalPot;
}

function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    let navHtml = '<ul class="sidebar-nav-list">';

    matches.forEach(match => {
        navHtml += `
            <li>
                <a href="#match-${match.id}" class="sidebar-link">
                    ${match.homeTeam} vs ${match.awayTeam}
                    <span class="sidebar-date">${match.shortDate} - ${match.date.split('T')[1].substring(0, 5)}</span>
                </a>
            </li>
        `;
    });

    navHtml += '</ul>';
    nav.innerHTML = navHtml;

    // Add active state to clicked links
    const links = nav.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        link.addEventListener('click', function () {
            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function renderMatches() {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const now = new Date();

    matches.forEach(match => {
        const matchDate = new Date(match.date);
        const isOpen = now < matchDate;
        const isFinished = match.finalHomeScore !== null && match.finalAwayScore !== null;

        const card = document.createElement('div');
        card.className = 'match-card';
        card.id = `match-${match.id}`;

        let betsHtml = '';
        if (!bets[match.id] || bets[match.id].length === 0) {
            betsHtml = '<p class="secret-bet">No hay apuestas todavía. ¡Sé el primero!</p>';
        } else {
            betsHtml = '<ul class="bets-list">';
            bets[match.id].forEach(bet => {
                let isWinner = false;
                if (isFinished) {
                    isWinner = (bet.homeScore === match.finalHomeScore && bet.awayScore === match.finalAwayScore);
                }

                if (isOpen) {
                    betsHtml += `
                        <li class="bet-item">
                            <span class="bet-name">${bet.name}</span>
                            <span class="secret-bet">🤫 Secreta</span>
                        </li>
                    `;
                } else {
                    betsHtml += `
                        <li class="bet-item" style="${isWinner ? 'background-color: #e8f5e9; border-color: #c8e6c9;' : ''}">
                            <span class="bet-name">
                                ${bet.name} 
                                ${isWinner ? '<span style="color: #2e7d32; font-weight: bold; margin-left: 5px;">👑 ¡Ganador!</span>' : ''}
                            </span>
                            <span class="bet-prediction" style="${isWinner ? 'background-color: #4caf50;' : ''}">${bet.homeScore} - ${bet.awayScore}</span>
                        </li>
                    `;
                }
            });
            betsHtml += '</ul>';
        }

        let formHtml = '';
        if (isOpen) {
            formHtml = `
                <form class="betting-form" onsubmit="placeBet(event, ${match.id})">
                    <div class="form-row">
                        <input type="text" id="name-${match.id}" placeholder="Tu nombre" required>
                        <input type="email" id="email-${match.id}" placeholder="Tu email" required>
                    </div>
                    <div class="scores-container">
                        <span class="team-name">${match.homeTeam}</span>
                        <span></span>
                        <span class="team-name">${match.awayTeam}</span>
                        
                        <input type="number" class="score-input" id="home-${match.id}" placeholder="${match.homeTeam.substring(0, 3)}" min="0" required>
                        <span class="score-divider">-</span>
                        <input type="number" class="score-input" id="away-${match.id}" placeholder="${match.awayTeam.substring(0, 3)}" min="0" required>
                    </div>
                    <button type="submit">Apostar 1€</button>
                </form>
            `;
        } else if (isFinished) {
            formHtml = `
                <div class="betting-form" style="background-color: #e2f2ff; border: 1px solid #3a83b3; justify-content: center;">
                    <h3 style="margin:0; border:none; padding:0; color:#385b94;">Resultado Final: ${match.homeTeam} ${match.finalHomeScore} - ${match.finalAwayScore} ${match.awayTeam}</h3>
                </div>
            `;
        }

        let statusText = 'Abiertas';
        let statusClass = 'status-open';
        let countdownText = '--:--:--';

        if (isFinished) {
            statusText = 'Finalizado';
            statusClass = 'status-closed';
            countdownText = 'Partido Acabado';
        } else if (!isOpen) {
            statusText = 'Cerradas';
            statusClass = 'status-closed';
            countdownText = 'En juego';
        }

        card.innerHTML = `
            <div class="match-header">
                <div class="match-info">
                    <h2>${match.homeTeam} vs ${match.awayTeam}</h2>
                    <p>${match.displayDate}</p>
                </div>
                <div class="match-status">
                    <div class="status-badge ${statusClass}">
                        ${statusText}
                    </div>
                    <div class="countdown" id="countdown-${match.id}" style="${isFinished ? 'font-size: 1rem;' : ''}">${countdownText}</div>
                </div>
            </div>
            <div class="match-body">
                ${formHtml}
                <h3>Apuestas (${bets[match.id] ? bets[match.id].length : 0})</h3>
                ${betsHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

window.placeBet = async function (event, matchId) {
    event.preventDefault();
    const nameInput = document.getElementById(`name-${matchId}`);
    const emailInput = document.getElementById(`email-${matchId}`);
    const homeInput = document.getElementById(`home-${matchId}`);
    const awayInput = document.getElementById(`away-${matchId}`);
    const button = event.target.querySelector('button');

    const newBet = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        homeScore: parseInt(homeInput.value),
        awayScore: parseInt(awayInput.value)
    };

    button.disabled = true;
    button.textContent = "Enviando...";

    try {
        const response = await fetch('/api/bets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                matchId: matchId,
                bet: newBet
            })
        });

        if (response.ok) {
            const result = await response.json();
            bets = result.data.bets;
            updatePotDisplay();
            renderMatches();
        } else {
            alert("Error al registrar la apuesta.");
            button.disabled = false;
            button.textContent = "Apostar 1€";
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Fallo de red al enviar la apuesta.");
        button.disabled = false;
        button.textContent = "Apostar 1€";
    }
};

function updateCountdowns() {
    const now = new Date();
    let needsRerender = false;

    matches.forEach(match => {
        const isFinished = match.finalHomeScore !== null && match.finalAwayScore !== null;
        if (isFinished) return; // Si ya hay resultado, no actualizamos el contador dinámicamente

        const matchDate = new Date(match.date);
        const countdownEl = document.getElementById(`countdown-${match.id}`);

        if (countdownEl) {
            if (now >= matchDate) {
                if (countdownEl.textContent !== "En juego" && countdownEl.textContent !== "Partido Acabado") {
                    countdownEl.textContent = "En juego";
                    needsRerender = true;
                }
            } else {
                const diff = matchDate - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const mins = Math.floor((diff / 1000 / 60) % 60);
                const secs = Math.floor((diff / 1000) % 60);

                let timeStr = "";
                if (days > 0) timeStr += `${days}d `;
                timeStr += `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                countdownEl.textContent = timeStr;
            }
        }
    });

    if (needsRerender) {
        renderMatches();
    }
}

// Inicialización
loadData(); // Llama al servidor para cargar la info (partidos y apuestas)
setInterval(updateCountdowns, 1000);
