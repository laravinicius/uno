import { MongoClient } from "mongodb";

// --- MUDANÇA CRÍTICA: FALLBACK DE EMERGÊNCIA ---
// Se a variável do Vercel falhar, ele usa a string fixa (que sabemos que funciona).
const uri = process.env.DATABASE_URL || "mongodb+srv://viniciusfelipe501_db_user:uno123456uno@unocluster.hycem7y.mongodb.net/unoDatabase?retryWrites=true&w=majority&appName=unocluster";
// -------------------------------------------------

const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
};

let client;
let clientPromise;

function getClientPromise() {
    // Agora isso nunca vai acontecer porque temos o fallback
    if (!uri) {
        throw new Error("ERRO: Nenhuma conexão disponível (Nem Variável, Nem Fallback).");
    }

    if (process.env.NODE_ENV === "development") {
        if (!global._mongoClientPromise) {
            client = new MongoClient(uri, options);
            global._mongoClientPromise = client.connect();
        }
        return global._mongoClientPromise;
    } else {
        if (!clientPromise) {
            client = new MongoClient(uri, options);
            clientPromise = client.connect();
        }
        return clientPromise;
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
    // Autenticação
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        const client = await getClientPromise();
        const db = client.db(); // Usa o banco definido na string (/unoDatabase)
        const collection = db.collection("placar");

        // --- GET ---
        if (req.method === "GET") {
            let data = await collection.findOne({ id: "uno_placar" });

            if (!data) {
                data = generateStructure();
                await collection.insertOne(data);
            }

            let updated = false;
            PLAYERS.forEach(p => {
                if (data.wins[p] === undefined) { data.wins[p] = 0; updated = true; }
                if (data.losses[p] === undefined) { data.losses[p] = 0; updated = true; }
            });

            if (updated) {
                await collection.updateOne({ id: "uno_placar" }, { $set: data });
            }

            const { _id, ...cleanData } = data;
            return res.status(200).json(cleanData);
        }

        // --- POST ---
        if (req.method === "POST") {
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
        console.error("Erro na API:", error);
        return res.status(500).json({ 
            error: "Erro ao processar dados", 
            details: error.message 
        });
    }
}