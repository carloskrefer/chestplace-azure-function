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

function ParameterTypeException(message) {
    this.message = message;
    this.name = ParameterTypeException.name;
    this.statusCode = statusCode.badRequest;
}

/* Controller */
app.http('get-carrinho', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'carrinhos/{compradorId}',
    handler: async (request, context) => {
        try {
            return await getData(request);
        } catch (exception) {
            return getErrorResponseByException(exception);
        }
    }
});

function getErrorResponseByException(exception) {
    return {
        status: exception.statusCode,
        body: exception.message
    };
}

async function getData(request) {
    const compradorId = Number(request.params.compradorId);

    if (!isNumber(compradorId))
        throw new ParameterTypeException('Path parameter não é um número.');

    const carrinho = await getOneCarrinhoByCompradorId(compradorId);

    if (!carrinho)
        throw new RecordNotFoundException('Nenhum carrinho encontrado para a sua busca.');

    return { body: JSON.stringify(carrinho) };
}

// Observation: this functions will return FALSE if value is NaN.
function isNumber(value) {
    if (isNaN(value))
        return false;

    return typeof (value) === 'number';
}

// Checks if the parameter is NaN.
function isNaN(value) {
    if (isObject(value))
        return false;

    return value !== value;
}

function isObject(value) {
    return typeof (value) === 'object';
}

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