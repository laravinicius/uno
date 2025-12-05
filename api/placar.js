import { MongoClient } from "mongodb";

// URI Hardcoded para teste (Elimina erro de variável de ambiente)
// Adicionei 'unoDatabase' na string para forçar o banco correto
const uri = "mongodb+srv://viniciusfelipe501_db_user:uno123456uno@unocluster.hycem7y.mongodb.net/unoDatabase?retryWrites=true&w=majority&appName=unocluster";

const options = {
    serverSelectionTimeoutMS: 5000, // Timeout de 5s para não ficar carregando infinitamente
    connectTimeoutMS: 10000,
};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    // ---------------------------------------------------------
    // MODO DIAGNÓSTICO (SEM AUTH)
    // ---------------------------------------------------------
    
    try {
        console.log("1. Iniciando conexão...");
        const client = await clientPromise;
        console.log("2. Conectado ao Cluster!");
        
        const db = client.db("unoDatabase");
        
        // Teste de Ping (Verifica se o banco responde)
        await db.command({ ping: 1 });
        console.log("3. Ping bem sucedido!");

        // Teste de Leitura/Escrita
        const collection = db.collection("placar_teste");
        await collection.insertOne({ teste: "ok", data: new Date() });
        console.log("4. Escrita bem sucedida!");

        const count = await collection.countDocuments();

        // SE CHEGAR AQUI, ESTÁ TUDO FUNCIONANDO
        return res.status(200).json({
            status: "SUCESSO TOTAL",
            mensagem: "Conexão com Banco de Dados funcionando perfeitamente.",
            documentos_teste: count,
            database: db.databaseName
        });

    } catch (error) {
        console.error("ERRO GRAVE:", error);
        
        // RETORNA O ERRO EXATO NA TELA
        return res.status(500).json({
            status: "FALHA NA CONEXÃO",
            erro_nome: error.name,
            erro_mensagem: error.message,
            erro_codigo: error.code,
            dica: "Leia a mensagem acima para saber se é Senha (Auth) ou Rede (Timeout)"
        });
    }
}