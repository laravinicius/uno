import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL || "mongodb+srv://viniciusfelipe501_db_user:uno123456uno@unocluster.hycem7y.mongodb.net/unoDatabase?retryWrites=true&w=majority&appName=unocluster";
const options = { serverSelectionTimeoutMS: 5000 };

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    if (!clientPromise) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    }
}

const PLAYERS = [
    "Vinicius", "Musumeci", "Fernando", "Cristyan",
    "Jonathan", "Jose", "Willians", "Renata", "Gabi"
];

function generateStructure() {
    const s = { id: "uno_placar", wins: {}, losses: {} };
    PLAYERS.forEach(p => { s.wins[p] = 0; s.losses[p] = 0; });
    return s;
}

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const collection = db.collection("placar");
        const configColl = db.collection("config");

        // === GET (Público) ===
        if (req.method === "GET") {
            let data = await collection.findOne({ id: "uno_placar" });
            if (!data) {
                data = generateStructure();
                await collection.insertOne(data);
            }
            
            // Sanitização
            let updated = false;
            PLAYERS.forEach(p => {
                if (data.wins[p] === undefined) { data.wins[p] = 0; updated = true; }
                if (data.losses[p] === undefined) { data.losses[p] = 0; updated = true; }
            });
            if (updated) await collection.updateOne({ id: "uno_placar" }, { $set: data });

            const { _id, ...cleanData } = data;
            return res.status(200).json(cleanData);
        }

        // === POST (Protegido via Banco) ===
        if (req.method === "POST") {
            // 1. Pega a senha enviada no header
            const sentToken = req.headers.authorization;
            
            // 2. Busca a senha real no banco
            const admin = await configColl.findOne({ id: "admin_user" });
            const realPass = admin ? admin.pass : "enaex@ti2025"; // Fallback seguro

            // 3. Compara
            if (sentToken !== realPass) {
                return res.status(401).json({ error: "Senha alterada ou incorreta. Faça login novamente." });
            }

            const { _id, ...bodyData } = req.body;
            await collection.updateOne(
                { id: "uno_placar" }, 
                { $set: bodyData }, 
                { upsert: true }
            );
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: "Método não permitido" });

    } catch (error) {
        console.error("Erro API:", error);
        return res.status(500).json({ error: "Erro no Servidor", details: error.message });
    }
}