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

const defaultStructure = {
    id: "uno_placar",
    wins: {
        Vinicius: 0,
        Musumeci: 0,
        Fernando: 0,
        Cristyan: 0,
        Jonathan: 0,
        Jose: 0,
        Willians: 0,
        Renata: 0,
        Gabi: 0
    },
    losses: {
        Vinicius: 0,
        Musumeci: 0,
        Fernando: 0,
        Cristyan: 0,
        Jonathan: 0,
        Jose: 0,
        Willians: 0,
        Renata: 0,
        Gabi: 0
    }
};

export default async function handler(req, res) {

    if (req.headers.authorization !== "enaex_ok") {
        return res.status(401).json({ error: "Não autorizado" });
    }

    const db = await connectDB();
    const collection = db.collection("placar");

    if (req.method === "GET") {
        let data = await collection.findOne({ id: "uno_placar" });

        if (!data) {
            await collection.insertOne(defaultStructure);
            data = defaultStructure;
        }

        delete data._id;
        return res.status(200).json(data);
    }

    if (req.method === "POST") {
        const body = req.body;

        await collection.updateOne(
            { id: "uno_placar" },
            { $set: body },
            { upsert: true }
        );

        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido" });
}
