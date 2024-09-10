const { app } = require('@azure/functions');
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://carloskrefer:3AFSiTE3n8EY0Q7Q@chestplace.pvyxw.mongodb.net/?retryWrites=true&w=majority&appName=chestplace";
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

app.http('carrinho', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let erroBanco = false;
        let resultado;

        try {
            resultado = await run();
        } catch (error) {
            console.log(error);
            erroBanco = true;
        }

        if (erroBanco) {
            return { body: `Erro no MongoDB!` };
        } else {
            return { body: `Resultado: ${JSON.stringify(resultado)}` };
        }
    }
});



async function run() {
    try {
        await client.connect();
        console.log("Conectado ao MongoDB!");

        const database = client.db("chestplace");
        const collection = database.collection("carrinhos");

        // Busca documentos com produto_id igual a 3
        const query = { produto_id: 3 };
        const resultado = await collection.find(query).toArray();

        return resultado;

    } finally {
        await client.close();
    }
}

