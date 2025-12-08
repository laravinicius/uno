// Variável principal de dados (Sem lista fixa)
let gameData = {
    players: [], 
    wins: {},
    losses: {}
};

// Inicialização
loadScores();
checkUiState();
setupEventListeners(); // Ativa o "Enter"

/* ------------------------- */
/* EVENT LISTENERS (ENTER)   */
/* ------------------------- */
function setupEventListeners() {
    // Ao apertar Enter no campo de senha, faz login
    document.getElementById("loginPass").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("btnConfirmLogin").click();
        }
    });

    // Ao apertar Enter no campo de usuário, pula para a senha
    document.getElementById("loginUser").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("loginPass").focus();
        }
    });

    // Ao apertar Enter no campo de Novo Jogador, adiciona
    document.getElementById("newPlayerName").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            addNewPlayer();
        }
    });
}

/* ------------------------- */
/* UI & MODAIS               */
/* ------------------------- */

function openModal(id) {
    document.getElementById(id).style.display = "flex";
    
    // Limpa campos e foca no primeiro input
    const inputs = document.querySelectorAll(`#${id} input`);
    inputs.forEach(i => i.value = "");
    if(inputs.length > 0) inputs[0].focus();

    document.querySelectorAll(`#${id} p`).forEach(p => p.style.display = "none");
    
    if(id === 'playersModal') renderPlayersList();
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

function checkUiState() {
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
/* AUTH (LOGIN/SENHA)        */
/* ------------------------- */

async function doLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;
    const errorMsg = document.getElementById("loginError");

    // Feedback visual de carregamento
    const btn = document.getElementById("btnConfirmLogin");
    const originalText = btn.innerText;
    btn.innerText = "Entrando...";
    btn.disabled = true;

    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, pass })
        });

        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem("authUser", user);
            sessionStorage.setItem("authToken", data.token);
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
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function doLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    checkUiState();
    updateTables();
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
            alert("Senha alterada! Faça login novamente.");
            doLogout();
            closeModal("passModal");
        } else {
            errorMsg.innerText = data.error || "Erro.";
            errorMsg.style.display = "block";
        }
    } catch (e) {
        errorMsg.innerText = "Erro de conexão.";
        errorMsg.style.display = "block";
    }
}

/* ------------------------- */
/* GERENCIAR JOGADORES (CRUD)*/
/* ------------------------- */

function renderPlayersList() {
    const list = document.getElementById("playersList");
    list.innerHTML = "";

    if (!gameData.players || gameData.players.length === 0) {
        list.innerHTML = "<p style='color:#777; text-align:center;'>Nenhum jogador.</p>";
        return;
    }

    // Ordena alfabeticamente
    const sortedPlayers = [...gameData.players].sort();

    sortedPlayers.forEach(p => {
        const div = document.createElement("div");
        div.style.cssText = "display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #333; align-items: center;";
        
        // Adicionamos o botão de Editar ao lado do Excluir
        div.innerHTML = `
            <span style="color: white; font-weight: bold; flex-grow: 1;">${p}</span>
            <div>
                <button onclick="editPlayer('${p}')" style="background: #0070f3; border:none; color:white; cursor:pointer; padding: 5px 10px; border-radius: 4px; margin-right: 5px;" title="Editar Nome">✏️</button>
                <button onclick="deletePlayer('${p}')" style="background: #c20000; border:none; color:white; cursor:pointer; padding: 5px 10px; border-radius: 4px;" title="Excluir Jogador">🗑️</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function addNewPlayer() {
    const input = document.getElementById("newPlayerName");
    const name = input.value.trim();

    if (!name) return alert("Digite um nome!");
    if (gameData.players.includes(name)) return alert("Já existe!");

    gameData.players.push(name);
    
    // Zera placar se for novo
    if (gameData.wins[name] === undefined) gameData.wins[name] = 0;
    if (gameData.losses[name] === undefined) gameData.losses[name] = 0;

    input.value = "";
    input.focus();
    
    renderPlayersList();
    updateTables();
    await saveScores();
}

// --- NOVA FUNÇÃO DE EDIÇÃO ---
async function editPlayer(oldName) {
    const newName = prompt(`Novo nome para ${oldName}:`, oldName);

    // Validações básicas
    if (!newName || newName.trim() === "") return; // Cancelou ou vazio
    if (newName === oldName) return; // Nome igual, não faz nada
    if (gameData.players.includes(newName)) {
        alert("Já existe um jogador com este nome!");
        return;
    }

    // 1. Atualiza a lista de nomes
    // Troca o nome antigo pelo novo na posição exata (ou map)
    gameData.players = gameData.players.map(p => p === oldName ? newName : p);

    // 2. Migra os pontos (Vitórias e Derrotas)
    // Copia os dados do antigo para a nova chave
    gameData.wins[newName] = gameData.wins[oldName];
    gameData.losses[newName] = gameData.losses[oldName];

    // 3. Apaga os dados do nome antigo para não deixar lixo no banco
    delete gameData.wins[oldName];
    delete gameData.losses[oldName];

    // 4. Salva e Atualiza Tela
    renderPlayersList();
    updateTables();
    await saveScores();
}

async function deletePlayer(name) {
    if (!confirm(`Remover ${name}? O histórico será apagado.`)) return;

    gameData.players = gameData.players.filter(p => p !== name);
    delete gameData.wins[name];
    delete gameData.losses[name];

    renderPlayersList();
    updateTables();
    await saveScores();
}

/* ------------------------- */
/* API & DADOS               */
/* ------------------------- */

async function loadScores() {
    try {
        const res = await fetch("/api/placar");
        if (!res.ok) throw new Error("Erro GET");
        
        const data = await res.json();
        
        gameData.wins = data.wins || {};
        gameData.losses = data.losses || {};
        
        // Lógica de Migração: Se não tem lista 'players', cria baseada nas chaves
        gameData.players = data.players || [];
        if (gameData.players.length === 0) {
            const allNames = new Set([...Object.keys(gameData.wins), ...Object.keys(gameData.losses)]);
            gameData.players = Array.from(allNames);
        }

        updateTables();
    } catch (error) {
        console.error("Erro load:", error);
    }
}

async function saveScores() {
    const token = sessionStorage.getItem("authToken");
    if (!token) return; 

    try {
        const res = await fetch("/api/placar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify(gameData)
        });

        if (!res.ok) {
            if (res.status === 401) {
                alert("Sessão expirada. Logue novamente.");
                doLogout();
            } else {
                console.error("Erro ao salvar.");
            }
        }
    } catch (e) {
        console.error("Erro rede:", e);
    }
}

/* ------------------------- */
/* RENDERIZAÇÃO TABELAS      */
/* ------------------------- */

function updateTables() {
    const isLogged = !!sessionStorage.getItem("authToken");

    document.querySelectorAll(".col-actions").forEach(th => {
        th.style.display = isLogged ? "" : "none";
    });

    if (gameData.players.length === 0) {
        document.querySelector("#winTable tbody").innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>Sem jogadores cadastrados.<br>Faça login para adicionar.</td></tr>";
        document.querySelector("#lossTable tbody").innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>Sem jogadores cadastrados.</td></tr>";
        return;
    }

    const winRank = [...gameData.players].sort((a, b) => (gameData.wins[b]||0) - (gameData.wins[a]||0));
    const lossRank = [...gameData.players].sort((a, b) => (gameData.losses[b]||0) - (gameData.losses[a]||0));

    const maxWins = gameData.wins[winRank[0]] || 0;
    const maxLoss = gameData.losses[lossRank[0]] || 0;

    const renderRows = (rankList, type) => {
        const tbody = document.querySelector(`#${type}Table tbody`);
        tbody.innerHTML = "";
        const maxVal = type === "win" ? maxWins : maxLoss;

        rankList.forEach(p => {
            const val = type === "win" ? (gameData.wins[p]||0) : (gameData.losses[p]||0);
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

async function addWin(p) { gameData.wins[p]++; updateTables(); await saveScores(); }
async function removeWin(p) { if(gameData.wins[p]>0) gameData.wins[p]--; updateTables(); await saveScores(); }

async function addLoss(p) { gameData.losses[p]++; updateTables(); await saveScores(); }
async function removeLoss(p) { if(gameData.losses[p]>0) gameData.losses[p]--; updateTables(); await saveScores(); }