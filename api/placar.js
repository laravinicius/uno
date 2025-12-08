import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL || "mongodb+srv://viniciusfelipe501_db_user:uno123456uno@unocluster.hycem7y.mongodb.net/unoDatabase?retryWrites=true&w=majority&appName=unocluster";
const options = { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 10000 };

let client;
let clientPromise;

function getClientPromise() {
    if (!uri) throw new Error("ERRO: Nenhuma conexão disponível.");
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

export default async function handler(req, res) {
    try {
        const client = await getClientPromise();
        const db = client.db();
        const collection = db.collection("placar");
        const configColl = db.collection("config");

        // --- GET (PÚBLICO) ---
        if (req.method === "GET") {
            let data = await collection.findOne({ id: "uno_placar" });
            
            // Se não existir, cria estrutura inicial vazia
            if (!data) {
                data = { id: "uno_placar", players: [], wins: {}, losses: {} };
                await collection.insertOne(data);
            }

            const { _id, ...cleanData } = data;
            return res.status(200).json(cleanData);
        }

        // --- POST (PROTEGIDO) ---
        if (req.method === "POST") {
            const sentToken = req.headers.authorization;
            
            // Busca a senha real no banco para validar
            const admin = await configColl.findOne({ id: "admin_user" });
            const realPass = admin ? admin.pass : "enaex@ti2025";

            if (sentToken !== realPass) {
                return res.status(401).json({ error: "Não autorizado" });
            }

            const { _id, ...bodyData } = req.body;
            
            // Salva tudo (incluindo adição/remoção de jogadores)
            await collection.updateOne(
                { id: "uno_placar" },
                { $set: bodyData },
                { upsert: true }
            );
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: "Método inválido" });

    } catch (error) {
        console.error("Erro API Placar:", error);
        return res.status(500).json({ error: "Erro no servidor" });
    }
}