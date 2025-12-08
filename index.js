const players = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

let scores = { wins: {}, losses: {} };

// Inicialização
loadScores();
checkUiState();

/* ------------------------- */
/* UI & MODAIS               */
/* ------------------------- */

function openModal(id) {
    document.getElementById(id).style.display = "flex";
    // Limpa campos e erros ao abrir
    document.querySelectorAll(`#${id} input`).forEach(i => i.value = "");
    document.querySelectorAll(`#${id} p`).forEach(p => p.style.display = "none");
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

function checkUiState() {
    // sessionStorage: Morre quando fecha a aba
    const token = sessionStorage.getItem("authToken");
    
    if (token) {
        document.getElementById("btnLogin").style.display = "none";
        document.getElementById("adminControls").style.display = "inline-block";
    } else {
        document.getElementById("btnLogin").style.display = "inline-block";
        document.getElementById("adminControls").style.display = "none";
    }
}

/* ------------------------- */
/* AUTENTICAÇÃO (API)        */
/* ------------------------- */

async function doLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;
    const errorMsg = document.getElementById("loginError");

    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, pass })
        });

        const data = await res.json();

        if (res.ok) {
            // Salva no SESSION STORAGE (Logoff automático ao fechar aba)
            sessionStorage.setItem("authUser", user);
            sessionStorage.setItem("authToken", data.token); // Token é a senha neste caso
            
            closeModal("loginModal");
            checkUiState();
            updateTables();
        } else {
            errorMsg.innerText = data.error || "Erro ao entrar.";
            errorMsg.style.display = "block";
        }
    } catch (e) {
        errorMsg.innerText = "Erro de conexão.";
        errorMsg.style.display = "block";
    }
}

async function changePassword() {
    const currentPass = document.getElementById("currentPass").value;
    const newPass = document.getElementById("newPass").value;
    const errorMsg = document.getElementById("passError");
    const user = sessionStorage.getItem("authUser") || "enaex";

    try {
        const res = await fetch("/api/auth", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, currentPass, newPass })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Senha alterada com sucesso! Faça login novamente.");
            doLogout();
            closeModal("passModal");
        } else {
            errorMsg.innerText = data.error || "Erro ao alterar.";
            errorMsg.style.display = "block";
        }
    } catch (e) {
        errorMsg.innerText = "Erro de conexão.";
        errorMsg.style.display = "block";
    }
}

function doLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    checkUiState();
    updateTables();
}

/* ------------------------- */
/* PLACAR (API)              */
/* ------------------------- */

async function loadScores() {
    try {
        const res = await fetch("/api/placar");
        if (!res.ok) throw new Error("Erro API GET");
        
        const data = await res.json();
        scores.wins = data.wins || {};
        scores.losses = data.losses || {};

        // Garante integridade
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
    const token = sessionStorage.getItem("authToken");
    if (!token) return; // Não tenta salvar se não tiver logado

    try {
        const res = await fetch("/api/placar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token // Envia a senha/token para validar no banco
            },
            body: JSON.stringify(scores)
        });

        if (!res.ok) {
            if (res.status === 401) {
                alert("Sessão inválida ou senha alterada. Logue novamente.");
                doLogout();
            } else {
                console.error("Erro ao salvar dados.");
            }
        }
    } catch (e) {
        console.error("Erro rede save:", e);
    }
}

/* ------------------------- */
/* RENDERIZAÇÃO              */
/* ------------------------- */

function updateTables() {
    const isLogged = !!sessionStorage.getItem("authToken");

    // Esconde/Mostra cabeçalhos da coluna Ações
    document.querySelectorAll(".col-actions").forEach(th => {
        th.style.display = isLogged ? "" : "none";
    });

    const winRank = [...players].sort((a, b) => scores.wins[b] - scores.wins[a]);
    const lossRank = [...players].sort((a, b) => scores.losses[b] - scores.losses[a]);

    const maxWins = scores.wins[winRank[0]];
    const maxLoss = scores.losses[lossRank[0]];

    const renderRows = (rankList, type) => {
        const tbody = document.querySelector(`#${type}Table tbody`);
        tbody.innerHTML = "";
        const maxVal = type === "win" ? maxWins : maxLoss;

        rankList.forEach(p => {
            const val = type === "win" ? scores.wins[p] : scores.losses[p];
            const icon = (val === maxVal && maxVal > 0) 
                ? (type === "win" ? " 👑" : " 😭") 
                : "";

            const actionCell = isLogged 
                ? `<td class="actions">
                     <button class="add" onclick="${type === 'win' ? 'addWin' : 'addLoss'}('${p}')">+</button>
                     <button class="remove" onclick="${type === 'win' ? 'removeWin' : 'removeLoss'}('${p}')">-</button>
                   </td>` 
                : "";

            const tr = document.createElement("tr");
            if (val === maxVal && maxVal > 0) tr.classList.add(type === "win" ? "row-win" : "row-loss");

            tr.innerHTML = `<td>${p}${icon}</td><td>${val}</td>${actionCell}`;
            tbody.appendChild(tr);
        });
    };

    renderRows(winRank, "win");
    renderRows(lossRank, "loss");
}

/* ------------------------- */
/* AÇÕES DE JOGO             */
/* ------------------------- */

async function addWin(p) { scores.wins[p]++; updateTables(); await saveScores(); }
async function removeWin(p) { if(scores.wins[p]>0) scores.wins[p]--; updateTables(); await saveScores(); }

async function addLoss(p) { scores.losses[p]++; updateTables(); await saveScores(); }
async function removeLoss(p) { if(scores.losses[p]>0) scores.losses[p]--; updateTables(); await saveScores(); }