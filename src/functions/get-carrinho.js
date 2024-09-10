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

app.http('getCarrinho', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'carrinho',
    handler: async (request, context) => {
        const isQueryParamProvided = Boolean(request.query.get('compradorId'));
        console.log("1");
        console.log(request.query.compradorId)
        if (!isQueryParamProvided) {
            console.log("2");
            return {
                status: 400,
                message: "Parâmetro 'compradorId' não foi informado."
            };
        }

        let carrinho;
        console.log("3");
        try {
            carrinho = await getOneCarrinhoByCompradorId(request);
        } catch(error) {
            console.log("4");
            return {
                status: 500,
                message: error
            };
        }

        const isRecordFound = Boolean(carrinho);
        if (!isRecordFound) {
            console.log("5");
            return {
                status: 404,
                message: "Nenhum carrinho encontrado para o 'compradorId' informado."
            };
        }

        console.log("6");
        return { body: JSON.stringify(carrinho)};
    }
});

async function getOneCarrinhoByCompradorId(request) {
    try {
        await client.connect();
        const database = client.db("chestplace");
        const collection = database.collection("carrinhos");
        console.log("7");
        const compradorId = Number(request.query.get('compradorId'));
        const query = { comprador_id: compradorId };

        return await collection.findOne(query);
    } finally {
        await client.close();
    }
}