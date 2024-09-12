/* Imports */
const { app } = require('@azure/functions');
const { MongoClient, ServerApiVersion } = require('mongodb');

/* MongoDB constants */
const mongoUri = "mongodb+srv://carloskrefer:3AFSiTE3n8EY0Q7Q@chestplace.pvyxw.mongodb.net/?retryWrites=true&w=majority&appName=chestplace";
const mongoClient = new MongoClient(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});
const mongoDbName = "chestplace";
const mongoCollectionName = "carrinhos";

/* HTTP status codes */
const statusCode = {
    badRequest: 400,
    notFound: 404,
    internalServerError: 500
};

/* Exceptions */
function QueryParamNotProvidedException(message) {
    this.message = message;
    this.name = QueryParamNotProvidedException.name;
    this.statusCode = statusCode.badRequest;
}

function RecordNotFoundException(message) {
    this.message = message;
    this.name = RecordNotFoundException.name;
    this.statusCode = statusCode.notFound;
}

function DatabaseConnectionException(message) {
    this.message = message;
    this.name = DatabaseConnectionException.name;
    this.statusCode = statusCode.internalServerError;
}

/* Other helper functions */
function getErrorResponseByException(exception) {
    return {
        status: exception.statusCode,
        body: exception.message
    };
}

/* Controller */
app.http('getCarrinho', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'carrinhos',
    handler: async (request, context) => {
        try {
            console.log("1");
            return await getResponse(request);
        } catch(exception) {
            console.log("2");
            return getErrorResponseByException(exception);
        }
    }
});

async function getResponse(request) {
    let response;

    switch (request.method) {
        case 'GET':
            response = await getData(request);
            break;
        case 'POST':
            response = await postData(request);
        case 'PUT':
        case 'DELETE':
            response = "";
            break;
    }

    console.log("3");
    return { body: JSON.stringify(response) };
}

async function getData(request) {
    console.log("4");
    validateGetRequestQueryParam(request);
    const carrinho = await getOneCarrinhoByCompradorId(
        Number(request.query.get('compradorId'))
    );
    validateGetRequestResult(carrinho);
    return carrinho;
}

async function postData(request) {

}

function validateGetRequestQueryParam(request) {
    if (!isQueryParamProvided(request, 'compradorId')) {
        const message = 'Query parameter "compradorId" não foi informado.';
        throw new QueryParamNotProvidedException(message);
    }
}

function validateGetRequestResult(carrinho) {
    const isRecordFound = Boolean(carrinho);
    if (!isRecordFound) {
        const message = 'Nenhum carrinho encontrado para a sua busca.';
        throw new RecordNotFoundException(message);
    }
}

function isQueryParamProvided(request, queryParamName) {
    return Boolean(request.query.get(queryParamName));
}

// async function getOneCarrinhoByCompradorId(request) {
//     try { 
//         await mongoClient.connect();
//         const database = mongoClient.db("chestplace");
//         const collection = database.collection("carrinhos");
//         console.log("7");
//         const compradorId = Number(request.query.get('compradorId'));
//         const query = { comprador_id: compradorId };

//         return await collection.findOne(query);
//     } catch (exception) {
//         const message = 
//             'Ocorreu um erro durante a conexão com o banco de dados: '
//             + exception.message;
//         throw new DatabaseConnectionException(message);
//     } finally {
//         await mongoClient.close();
//     }
// }

async function getOneCarrinhoByCompradorId(compradorId) {
    const query = { comprador_id: compradorId };

    return executeDatabaseCommand(mongoDbCollection =>
        mongoDbCollection.findOne(query)
    );
}

async function executeDatabaseCommand(callback) {
    try { 
        await mongoClient.connect();
        const database = mongoClient.db(mongoDbName);
        const collection = database.collection(mongoCollectionName);
        return await callback(collection);
    } catch (exception) {
        const message = 
            'Ocorreu um erro durante a conexão com o banco de dados: '
            + exception.message;
        throw new DatabaseConnectionException(message);
    } finally {
        await mongoClient.close();
    }
}


