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

export default async function handler(req, res) {

    // Autenticação simples
    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    const db = await connectDB();
    const collection = db.collection("placar");

    if (req.method === "GET") {
        const data = await collection.findOne({ id: "uno_placar" });

        if (!data) {
            // primeira execução → criar placar zerado
            const empty = { id: "uno_placar", wins: {}, losses: {} };
            await collection.insertOne(empty);
            return res.status(200).json(empty);
        }

        delete data._id; // remover campo interno do Mongo
        return res.status(200).json(data);
    }

    if (req.method === "POST") {
        const placar = req.body;

        await collection.updateOne(
            { id: "uno_placar" },
            { $set: placar },
            { upsert: true }
        );

        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
