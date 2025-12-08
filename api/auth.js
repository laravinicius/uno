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

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const configColl = db.collection("config");

        // 1. Busca ou Cria o Usuário Admin Padrão
        let admin = await configColl.findOne({ id: "admin_user" });
        if (!admin) {
            admin = { id: "admin_user", user: "enaex", pass: "enaex@ti2025" };
            await configColl.insertOne(admin);
        }

        // === ROTA DE LOGIN (POST) ===
        if (req.method === "POST" && !req.body.newPass) {
            const { user, pass } = req.body;

            if (user === admin.user && pass === admin.pass) {
                // Retorna sucesso e o token (neste caso simples, a própria senha serve como token)
                return res.status(200).json({ ok: true, token: admin.pass });
            } else {
                return res.status(401).json({ error: "Usuário ou senha incorretos." });
            }
        }

        // === ROTA DE TROCAR SENHA (PUT) ===
        if (req.method === "PUT") {
            const { user, currentPass, newPass } = req.body;

            // Verifica credenciais atuais antes de trocar
            if (user !== admin.user || currentPass !== admin.pass) {
                return res.status(401).json({ error: "Senha atual incorreta." });
            }

            if (!newPass || newPass.length < 4) {
                return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres." });
            }

            // Atualiza no banco
            await configColl.updateOne(
                { id: "admin_user" },
                { $set: { pass: newPass } }
            );

            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: "Método não permitido" });

    } catch (error) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: "Erro interno" });
    }
}