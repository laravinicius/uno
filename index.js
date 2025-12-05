const players = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

let scores = {
    wins: {},
    losses: {}
};

/* ------------------------- */
/* AUTENTICAÇÃO SIMPLES      */
/* ------------------------- */

function checkAuth() {
    if (localStorage.getItem("auth") === "enaex_ok") {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appContent").style.display = "block";
        loadScores();
    }
}

function doLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    if (user === "enaex" && pass === "enaex@ti2025") {
        localStorage.setItem("auth", "enaex_ok");
        checkAuth();
    } else {
        document.getElementById("loginError").style.display = "block";
    }
}

checkAuth();

/* ------------------------- */
/*   API Functions           */
/* ------------------------- */

async function loadScores() {
    try {
        const res = await fetch("/api/placar", {
            headers: { "Authorization": "enaex_ok" }
        });

        if (!res.ok) throw new Error(`Erro API: ${res.status}`);

        const data = await res.json();

        scores.wins = data.wins || {};
        scores.losses = data.losses || {};

    } catch (error) {
        console.error("Erro ao carregar placar, exibindo zerado:", error);
        // Opcional: Mostrar um alerta visual para o usuário
    } finally {
        // Garante que a tabela seja desenhada mesmo se a API falhar ou estiver vazia
        players.forEach(p => {
            if (scores.wins[p] === undefined) scores.wins[p] = 0;
            if (scores.losses[p] === undefined) scores.losses[p] = 0;
        });
        
        updateTables();
    }
}

async function saveScores() {
    await fetch("/api/placar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "enaex_ok"
        },
        body: JSON.stringify(scores)
    });
}

/* ------------------------- */
/* TABELAS                   */
/* ------------------------- */

function updateTables() {
    const winRank = [...players].sort((a, b) => scores.wins[b] - scores.wins[a]);
    const lossRank = [...players].sort((a, b) => scores.losses[b] - scores.losses[a]);

    const maxWins = scores.wins[winRank[0]];
    const maxLoss = scores.losses[lossRank[0]];

    const winBody = document.querySelector("#winTable tbody");
    const lossBody = document.querySelector("#lossTable tbody");

    winBody.innerHTML = "";
    lossBody.innerHTML = "";

    document.querySelectorAll("tr").forEach(tr => {
        tr.classList.remove("row-win", "row-loss");
    });

    // vitórias
    winRank.forEach(p => {
        const crown = scores.wins[p] === maxWins && maxWins > 0 ? " 👑" : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p}${crown}</td>
            <td>${scores.wins[p]}</td>
            <td class="actions">
                <button class="add" onclick="addWin('${p}')">+</button>
                <button class="remove" onclick="removeWin('${p}')">-</button>
            </td>
        `;

        if (scores.wins[p] === maxWins && maxWins > 0) {
            tr.classList.add("row-win");
        }

        winBody.appendChild(tr);
    });

    // derrotas
    lossRank.forEach(p => {
        const cry = scores.losses[p] === maxLoss && maxLoss > 0 ? " 😭" : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p}${cry}</td>
            <td>${scores.losses[p]}</td>
            <td class="actions">
                <button class="add" onclick="addLoss('${p}')">+</button>
                <button class="remove" onclick="removeLoss('${p}')">-</button>
            </td>
        `;

        if (scores.losses[p] === maxLoss && maxLoss > 0) {
            tr.classList.add("row-loss");
        }

        lossBody.appendChild(tr);
    });
}

/* ------------------------- */
/* AÇÕES                     */
/* ------------------------- */

async function addWin(p) {
    scores.wins[p]++;
    await saveScores();
    updateTables();
}

async function removeWin(p) {
    if (scores.wins[p] > 0) scores.wins[p]--;
    await saveScores();
    updateTables();
}

async function addLoss(p) {
    scores.losses[p]++;
    await saveScores();
    updateTables();
}

async function removeLoss(p) {
    if (scores.losses[p] > 0) scores.losses[p]--;
    await saveScores();
    updateTables();
}
