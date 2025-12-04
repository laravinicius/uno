let placar = {
    wins: {},
    losses: {}
};

// RESTORE AUTOMÁTICO DO GOOGLE SHEETS
async function restoreFromBackup() {
    try {
        const res = await fetch(process.env.BACKUP_URL, {
            method: "GET"
        });

        if (!res.ok) {
            console.log("Não foi possível restaurar:", res.status);
            return null;
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.log("Erro no restore:", err);
        return null;
    }
}

// BACKUP AUTOMÁTICO
async function backup(placarData) {
    try {
        await fetch(process.env.BACKUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(placarData)
        });
    } catch (e) {
        console.log("Erro no backup:", e);
    }
}

export default async function handler(req, res) {
    // AUTENTICAÇÃO BÁSICA
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    // 🔥 RESTORE AUTOMÁTICO SE O PLACAR ESTIVER VAZIO
    const isEmpty =
        Object.keys(placar.wins).length === 0 &&
        Object.keys(placar.losses).length === 0;

    if (isEmpty) {
        console.log("Placar vazio — restaurando do backup…");
        const restored = await restoreFromBackup();

        if (restored) {
            placar = restored;
            console.log("Restore concluído.");
        } else {
            console.log("Nenhum backup encontrado.");
        }
    }

    // → GET: retornar o placar (já restaurado, se necessário)
    if (req.method === "GET") {
        return res.status(200).json(placar);
    }

    // → POST: atualizar placar + fazer backup
    if (req.method === "POST") {
        placar = req.body;

        // BACKUP AUTOMÁTICO
        await backup(placar);

        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
