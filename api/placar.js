import { MongoClient } from "mongodb";

// --- CONFIGURAÇÃO SEGURA ---
// Não tentamos conectar logo de cara para evitar o crash "FUNCTION_INVOCATION_FAILED"
const uri = process.env.MONGO_URI;
const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
};

let client;
let clientPromise;

// Função para iniciar a conexão apenas quando necessário
function getClientPromise() {
    if (!uri) {
        throw new Error("A variável MONGO_URI não foi encontrada no Vercel.");
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
    // 1. Diagnóstico de Variável de Ambiente (Para debugging)
    if (!uri) {
        console.error("ERRO CRÍTICO: MONGO_URI está undefined.");
        return res.status(500).json({
            error: "Erro de Configuração no Vercel",
            details: "A variável de ambiente MONGO_URI não foi lida. Verifique em Settings > Environment Variables se ela está marcada para 'Production'."
        });
    }

    // 2. Autenticação
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        // 3. Conexão (Agora feita de forma protegida)
        const client = await getClientPromise();
        const db = client.db(); // Usa o banco definido na URI
        const collection = db.collection("placar");

        // --- GET ---
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
        console.error("ERRO API:", error);
        return res.status(500).json({
            error: "Falha ao conectar no Banco",
            message: error.message,
            stack: error.stack // Ajuda a entender onde quebrou
        });
    }
}