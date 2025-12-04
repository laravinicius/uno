const players = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

// Carregar LocalStorage
let scores = JSON.parse(localStorage.getItem("unoScores")) || {};

if (Object.keys(scores).length === 0) {
    players.forEach(p => scores[p] = { win: 0, loss: 0 });
    saveData();
}

function saveData() {
    localStorage.setItem("unoScores", JSON.stringify(scores));
}

function updateTables() {

    let winRank = [...players].sort((a, b) => scores[b].win - scores[a].win);
    let lossRank = [...players].sort((a, b) => scores[b].loss - scores[a].loss);

    // valores máximos de vitórias e derrotas
    const maxWins = scores[winRank[0]].win;
    const maxLoss = scores[lossRank[0]].loss;

    const winBody = document.querySelector("#winTable tbody");
    const lossBody = document.querySelector("#lossTable tbody");

    winBody.innerHTML = "";
    lossBody.innerHTML = "";

    // limpar auras antigas
    document.querySelectorAll("tr").forEach(tr => {
        tr.classList.remove("row-win", "row-loss");
    });

    // ---- TABELA DE VITÓRIAS ----
    winRank.forEach(p => {

        let crown = scores[p].win === maxWins && maxWins > 0 ? " 👑" : "";

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p}${crown}</td>
            <td>${scores[p].win}</td>
            <td class="actions">
                <button class="add" onclick="scores['${p}'].win++; saveData(); updateTables();">+</button>
                <button class="remove" onclick="if(scores['${p}'].win > 0){scores['${p}'].win--; saveData(); updateTables();}">-</button>
            </td>
        `;

        if (scores[p].win === maxWins && maxWins > 0) {
            tr.classList.add("row-win");
        }

        winBody.appendChild(tr);
    });

    // ---- TABELA DE DERROTAS ----
    lossRank.forEach(p => {

        let cry = scores[p].loss === maxLoss && maxLoss > 0 ? " 😭" : "";

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p}${cry}</td>
            <td>${scores[p].loss}</td>
            <td class="actions">
                <button class="add" onclick="scores['${p}'].loss++; saveData(); updateTables();">+</button>
                <button class="remove" onclick="if(scores['${p}'].loss > 0){scores['${p}'].loss--; saveData(); updateTables();}">-</button>
            </td>
        `;

        if (scores[p].loss === maxLoss && maxLoss > 0) {
            tr.classList.add("row-loss");
        }

        lossBody.appendChild(tr);
    });
}

updateTables();
