import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
let client;
let db;

async function connectDB() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db("unoDatabase");
    }
    return db;
}

const PLAYERS = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

function generateStructure() {
    const s = { id: "uno_placar", wins: {}, losses: {} };
    PLAYERS.forEach(p => {
        s.wins[p] = 0;
        s.losses[p] = 0;
    });
    return s;
}

export default async function handler(req, res) {

    // Autenticação
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    const db = await connectDB();
    const collection = db.collection("placar");

    // ===================
    // GET — LER PLACAR
    // ===================
    if (req.method === "GET") {
        let data = await collection.findOne({ id: "uno_placar" });

        // Se não existir, cria
        if (!data) {
            data = generateStructure();
            await collection.insertOne(data);
        }

        // Corrigir se faltar algum jogador
        let updated = false;
        PLAYERS.forEach(p => {
            if (data.wins[p] == null) { data.wins[p] = 0; updated = true; }
            if (data.losses[p] == null) { data.losses[p] = 0; updated = true; }
        });

        if (updated) {
            await collection.updateOne(
                { id: "uno_placar" },
                { $set: data }
            );
        }

        delete data._id;
        return res.status(200).json(data);
    }

    // ===================
    // POST — SALVAR PLACAR
    // ===================
    if (req.method === "POST") {
        await collection.updateOne(
            { id: "uno_placar" },
            { $set: req.body },
            { upsert: true }
        );
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
