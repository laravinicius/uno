import { MongoClient } from "mongodb";

// Configuração da conexão
const uri = process.env.MONGO_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
    throw new Error("ERRO CRÍTICO: A variável MONGO_URI não foi definida no Vercel.");
}

// Em desenvolvimento, usa variável global para não estourar conexões.
// Em produção, usa promise normal.
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
    // 1. Segurança: Verifica se a senha do APP está certa
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    try {
        // 2. Tenta conectar ao banco
        const client = await clientPromise;
        const db = client.db("unoDatabase");
        const collection = db.collection("placar");

        // 3. Lógica do GET (Ler dados)
        if (req.method === "GET") {
            let data = await collection.findOne({ id: "uno_placar" });

            // Se não existir dados, cria o inicial
            if (!data) {
                data = generateStructure();
                await collection.insertOne(data);
            }

            // Garante que todos jogadores existam no retorno
            let updated = false;
            PLAYERS.forEach(p => {
                if (data.wins[p] === undefined) { data.wins[p] = 0; updated = true; }
                if (data.losses[p] === undefined) { data.losses[p] = 0; updated = true; }
            });

            if (updated) {
                await collection.updateOne(
                    { id: "uno_placar" },
                    { $set: data }
                );
            }

            // Remove o ID interno do Mongo antes de enviar
            const { _id, ...cleanData } = data;
            return res.status(200).json(cleanData);
        }

        // 4. Lógica do POST (Salvar dados)
        if (req.method === "POST") {
            // Remove _id se vier no body para evitar erro
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
        console.error("ERRO NO MONGODB:", error);
        // Agora o navegador vai te mostrar qual foi o erro exato!
        return res.status(500).json({ 
            error: "Erro no Banco de Dados", 
            details: error.message 
        });
    }
}