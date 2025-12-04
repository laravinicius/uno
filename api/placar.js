let placar = {
    wins: {},
    losses: {}
};

export default function handler(req, res) {

    // autenticação simples
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    if (req.method === "GET") {
        return res.status(200).json(placar);
    }

    if (req.method === "POST") {
        placar = req.body;
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
