import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
};

let client;
let clientPromise;

function getClientPromise() {
    if (!uri) throw new Error("URI indefinida");
    
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
    // -----------------------------------------------------------
    // BLIBLIOTECA DE DIAGNÓSTICO (Executa se a variável falhar)
    // -----------------------------------------------------------
    if (!uri) {
        // Pega todas as chaves de variáveis de ambiente visíveis (esconde os valores por segurança)
        const envKeys = Object.keys(process.env).sort();
        
        // Procura por algo parecido com MONGO_URI (ex: mongo_uri, MONGOURI, etc)
        const possibleMatches = envKeys.filter(k => k.toUpperCase().includes("MONGO"));

        console.error("ERRO CRÍTICO: MONGO_URI não encontrada.");
        console.error("Variáveis disponíveis:", envKeys);

        return res.status(500).json({
            error: "Erro de Configuração - Variável não encontrada",
            debug_info: {
                message: "A variável MONGO_URI está indefinida ou vazia.",
                found_keys_starting_with_M: envKeys.filter(k => k.startsWith('M')),
                mongo_related_keys_found: possibleMatches.length > 0 ? possibleMatches : "Nenhuma",
                total_vars: envKeys.length,
                node_env: process.env.NODE_ENV
            },
            instruction: "Se 'found_keys' estiver vazio ou não mostrar MONGO_URI, tente o Passo 2 da solução (Forçar novo Build)."
        });
    }

    // --- CÓDIGO NORMAL ---
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        const client = await getClientPromise();
        const db = client.db(); 
        const collection = db.collection("placar");

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

        if (req.method === "POST") {
            const { _id, ...bodyData } = req.body;
            await collection.updateOne({ id: "uno_placar" }, { $set: bodyData }, { upsert: true });
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: "Método não permitido" });

    } catch (error) {
        return res.status(500).json({ error: "Erro no Banco de Dados", details: error.message });
    }
}   