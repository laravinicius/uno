let placar = {
    wins: {},
    losses: {}
};

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
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    if (req.method === "GET") {
        return res.status(200).json(placar);
    }

    if (req.method === "POST") {
        placar = req.body;

        // backup automático
        await backup(placar);

        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
