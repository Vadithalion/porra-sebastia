// Configuración de los partidos
const matches = [
    {
        id: 1,
        homeTeam: "España",
        awayTeam: "Cabo Verde",
        date: "2026-06-15T18:00:00+02:00",
        displayDate: "Lunes 15, 18:00",
        shortDate: "15 Jun"
    },
    {
        id: 2,
        homeTeam: "España",
        awayTeam: "Arabia Saudita",
        date: "2026-06-21T18:00:00+02:00",
        displayDate: "Domingo 21, 18:00",
        shortDate: "21 Jun"
    },
    {
        id: 3,
        homeTeam: "Uruguay",
        awayTeam: "España",
        date: "2026-06-27T02:00:00+02:00",
        displayDate: "Sábado 27, 02:00",
        shortDate: "27 Jun"
    }
];

// Estado de la aplicación
let bets = JSON.parse(localStorage.getItem('porraBets')) || {
    1: [],
    2: [],
    3: []
};

let previousPot = parseInt(localStorage.getItem('porraPot')) || 0;

function updatePotDisplay() {
    let currentBetsCount = 0;
    for(let matchId in bets) {
        currentBetsCount += bets[matchId].length;
    }
    const totalPot = previousPot + currentBetsCount; // 1€ por apuesta
    document.getElementById('total-pot').textContent = totalPot;
}

function saveBets() {
    localStorage.setItem('porraBets', JSON.stringify(bets));
    updatePotDisplay();
}

function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    let navHtml = '<ul class="sidebar-nav-list">';
    
    matches.forEach(match => {
        navHtml += `
            <li>
                <a href="#match-${match.id}" class="sidebar-link">
                    ${match.homeTeam} vs ${match.awayTeam}
                    <span class="sidebar-date">${match.shortDate} - ${match.date.split('T')[1].substring(0,5)}</span>
                </a>
            </li>
        `;
    });
    
    navHtml += '</ul>';
    nav.innerHTML = navHtml;

    // Add active state to clicked links
    const links = nav.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        link.addEventListener('click', function() {
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

        const card = document.createElement('div');
        card.className = 'match-card';
        card.id = `match-${match.id}`; // Add ID for anchor linking
        
        // Renderizar apuestas
        let betsHtml = '';
        if (bets[match.id].length === 0) {
            betsHtml = '<p class="secret-bet">No hay apuestas todavía. ¡Sé el primero!</p>';
        } else {
            betsHtml = '<ul class="bets-list">';
            bets[match.id].forEach(bet => {
                if (isOpen) {
                    // Apuesta secreta antes de empezar el partido
                    betsHtml += `
                        <li class="bet-item">
                            <span class="bet-name">${bet.name}</span>
                            <span class="secret-bet">🤫 Secreta</span>
                        </li>
                    `;
                } else {
                    // Apuesta revelada una vez empieza
                    betsHtml += `
                        <li class="bet-item">
                            <span class="bet-name">${bet.name}</span>
                            <span class="bet-prediction">${bet.homeScore} - ${bet.awayScore}</span>
                        </li>
                    `;
                }
            });
            betsHtml += '</ul>';
        }

        // Renderizar formulario si está abierto
        let formHtml = '';
        if (isOpen) {
            formHtml = `
                <form class="betting-form" onsubmit="placeBet(event, ${match.id})">
                    <input type="text" id="name-${match.id}" placeholder="Tu nombre" required>
                    <input type="number" id="home-${match.id}" placeholder="${match.homeTeam.substring(0,3)}" min="0" required>
                    <span class="score-divider">-</span>
                    <input type="number" id="away-${match.id}" placeholder="${match.awayTeam.substring(0,3)}" min="0" required>
                    <button type="submit">Apostar 1€</button>
                </form>
            `;
        }

        card.innerHTML = `
            <div class="match-header">
                <div class="match-info">
                    <h2>${match.homeTeam} vs ${match.awayTeam}</h2>
                    <p>${match.displayDate}</p>
                </div>
                <div class="match-status">
                    <div class="status-badge ${isOpen ? 'status-open' : 'status-closed'}">
                        ${isOpen ? 'Abiertas' : 'Cerradas'}
                    </div>
                    <div class="countdown" id="countdown-${match.id}">--:--:--</div>
                </div>
            </div>
            <div class="match-body">
                ${formHtml}
                <h3>Apuestas (${bets[match.id].length})</h3>
                ${betsHtml}
            </div>
        `;

        container.appendChild(card);
    });

    updatePotDisplay();
}

window.placeBet = function(event, matchId) {
    event.preventDefault();
    const nameInput = document.getElementById(`name-${matchId}`);
    const homeInput = document.getElementById(`home-${matchId}`);
    const awayInput = document.getElementById(`away-${matchId}`);

    bets[matchId].push({
        name: nameInput.value.trim(),
        homeScore: parseInt(homeInput.value),
        awayScore: parseInt(awayInput.value)
    });

    saveBets();
    renderMatches();
};

function updateCountdowns() {
    const now = new Date();
    let needsRerender = false;

    matches.forEach(match => {
        const matchDate = new Date(match.date);
        const countdownEl = document.getElementById(`countdown-${match.id}`);
        
        if (countdownEl) {
            if (now >= matchDate) {
                if (countdownEl.textContent !== "00:00:00") {
                    countdownEl.textContent = "00:00:00";
                    needsRerender = true; // El partido acaba de empezar, necesitamos revelar apuestas
                }
            } else {
                const diff = matchDate - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const mins = Math.floor((diff / 1000 / 60) % 60);
                const secs = Math.floor((diff / 1000) % 60);

                let timeStr = "";
                if(days > 0) timeStr += `${days}d `;
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
renderSidebar();
renderMatches();
setInterval(updateCountdowns, 1000);
updateCountdowns();
