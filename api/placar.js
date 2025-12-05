import { MongoClient } from "mongodb";

// Pega a variável do Vercel
const uri = process.env.MONGO_URI;
const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
};

let client;
let clientPromise;

if (!uri) {
    throw new Error("ERRO CRÍTICO: A variável MONGO_URI não está definida no Vercel.");
}

// Configuração para manter a conexão ativa no Vercel (Best Practice)
if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
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
    // 1. Segurança: Verifica a senha do APP (definida no index.js)
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado. Verifique o index.js" });
    }

    try {
        const client = await clientPromise;
        const db = client.db(); // Pega o banco definido na URI (/unoDatabase)
        const collection = db.collection("placar");

        // --- MÉTODOS ---

        // Ler Placar (GET)
        if (req.method === "GET") {
            let data = await collection.findOne({ id: "uno_placar" });

            if (!data) {
                data = generateStructure();
                await collection.insertOne(data);
            }

            // Garante que novos jogadores apareçam
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

        // Salvar Placar (POST)
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
            error: "Erro de Conexão com o Banco", 
            details: error.message 
        });
    }
}