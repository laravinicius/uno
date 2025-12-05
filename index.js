const players = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

let scores = { wins: {}, losses: {} };

// Carrega o placar assim que abre a página
loadScores();
checkUiState(); // Verifica se mostra botão Login ou Sair

/* ------------------------- */
/* SISTEMA DE LOGIN        */
/* ------------------------- */

function openLogin() {
    document.getElementById("loginModal").style.display = "flex";
    document.getElementById("loginUser").focus();
}

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("loginError").style.display = "none";
}

function doLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    if (user === "enaex" && pass === "enaex@ti2025") {
        localStorage.setItem("auth", "enaex_ok");
        closeLogin();
        checkUiState();
        updateTables(); // Redesenha a tabela para aparecer os botões
    } else {
        document.getElementById("loginError").style.display = "block";
    }
}

function doLogout() {
    if(confirm("Deseja sair do modo admin?")) {
        localStorage.removeItem("auth");
        checkUiState();
        updateTables(); // Redesenha a tabela para sumir os botões
    }
}

function checkUiState() {
    const isLogged = localStorage.getItem("auth") === "enaex_ok";
    document.getElementById("btnLogin").style.display = isLogged ? "none" : "inline-block";
    document.getElementById("btnLogout").style.display = isLogged ? "inline-block" : "none";
}

/* ------------------------- */
/* API & DADOS             */
/* ------------------------- */

async function loadScores() {
    try {
        // GET agora é público, não enviamos header
        const res = await fetch("/api/placar");
        if (!res.ok) throw new Error("Erro API GET");
        
        const data = await res.json();
        scores.wins = data.wins || {};
        scores.losses = data.losses || {};

        players.forEach(p => {
            if (scores.wins[p] === undefined) scores.wins[p] = 0;
            if (scores.losses[p] === undefined) scores.losses[p] = 0;
        });

        updateTables();

    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

async function saveScores() {
    try {
        const res = await fetch("/api/placar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Enviamos a senha para poder salvar
                "Authorization": "enaex_ok" 
            },
            body: JSON.stringify(scores)
        });

        if (!res.ok) {
            if (res.status === 401) {
                alert("Sessão expirada ou sem permissão. Faça login novamente.");
                doLogout();
            } else {
                alert("Erro ao salvar!");
            }
        }
    } catch (e) {
        console.error("Erro save:", e);
    }
}

/* ------------------------- */
/* TABELAS (RENDERIZAÇÃO)    */
/* ------------------------- */

function updateTables() {
    const isAdmin = localStorage.getItem("auth") === "enaex_ok";

    // 1. Controla a visibilidade dos Cabeçalhos (Ações)
    const headers = document.querySelectorAll(".col-actions");
    headers.forEach(th => {
        th.style.display = isAdmin ? "" : "none";
    });

    const winRank = [...players].sort((a, b) => scores.wins[b] - scores.wins[a]);
    const lossRank = [...players].sort((a, b) => scores.losses[b] - scores.losses[a]);

    const maxWins = scores.wins[winRank[0]];
    const maxLoss = scores.losses[lossRank[0]];

    const winBody = document.querySelector("#winTable tbody");
    const lossBody = document.querySelector("#lossTable tbody");

    winBody.innerHTML = "";
    lossBody.innerHTML = "";

    // --- Renderiza Vitórias ---
    winRank.forEach(p => {
        const crown = scores.wins[p] === maxWins && maxWins > 0 ? " 👑" : "";
        
        // Se for admin, cria a célula com botões. Se não, string vazia.
        const actionCell = isAdmin 
            ? `<td class="actions">
                   <button class="add" onclick="addWin('${p}')">+</button>
                   <button class="remove" onclick="removeWin('${p}')">-</button>
               </td>` 
            : "";

        const tr = document.createElement("tr");
        if (scores.wins[p] === maxWins && maxWins > 0) tr.classList.add("row-win");
        
        // Note que actionCell só entra no HTML se for admin
        tr.innerHTML = `<td>${p}${crown}</td><td>${scores.wins[p]}</td>${actionCell}`;
        winBody.appendChild(tr);
    });

    // --- Renderiza Derrotas ---
    lossRank.forEach(p => {
        const cry = scores.losses[p] === maxLoss && maxLoss > 0 ? " 😭" : "";

        const actionCell = isAdmin 
            ? `<td class="actions">
                   <button class="add" onclick="addLoss('${p}')">+</button>
                   <button class="remove" onclick="removeLoss('${p}')">-</button>
               </td>` 
            : "";

        const tr = document.createElement("tr");
        if (scores.losses[p] === maxLoss && maxLoss > 0) tr.classList.add("row-loss");

        tr.innerHTML = `<td>${p}${cry}</td><td>${scores.losses[p]}</td>${actionCell}`;
        lossBody.appendChild(tr);
    });
}

/* ------------------------- */
/* AÇÕES                     */
/* ------------------------- */

async function addWin(p) { scores.wins[p]++; updateTables(); await saveScores(); }
async function removeWin(p) { if(scores.wins[p]>0) scores.wins[p]--; updateTables(); await saveScores(); }

async function addLoss(p) { scores.losses[p]++; updateTables(); await saveScores(); }
async function removeLoss(p) { if(scores.losses[p]>0) scores.losses[p]--; updateTables(); await saveScores(); }