const { app } = require('@azure/functions');
const { MongoClient, ServerApiVersion } = require('mongodb');

class CarrinhoModel {
    compradorId;
    produtos;

    validate() {
        ValidatorHelper.validateNumberRequired(this.compradorId, 'compradorId');
        this.#validateProdutos();
    }

    #validateProdutos() {
        ValidatorHelper.validateArray(this.produtos, 'produtos');

        if (this.produtos.some(produto => !(produto instanceof ProdutoModel)))
            throw new ObjectTypeException(
                'Atribuída a classe Carrinho elementos que não são instância de Produto.'
            );

        this.produtos.forEach(produto => produto.validate());
    }
}

class ProdutoModel {
    id;
    titulo;
    preco;
    preco_promocional;
    descricao;

    validate() {
        ValidatorHelper.validateNumberRequired(this.id, 'id');
        ValidatorHelper.validateStringRequired(this.titulo, 'titulo');
        ValidatorHelper.validateNumberRequired(this.preco, 'preco');
        ValidatorHelper.validateNumberRequired(this.preco_promocional, 'preco_promocional');
        ValidatorHelper.validateStringRequired(this.descricao, 'descricao');
    }
}

class ValidatorHelper {
    static validateNumberRequired(value, description) {
        if (!isNumber(value))
            throw new ParameterTypeException(
                `Atributo "${description}" é obrigatório e deve ser um número.`
            );
    }

    static validateStringRequired(value, description) {
        if (!value)
            throw new ParameterNotProvidedException(
                `Atributo "${description}" é obrigatório e não pode ser nulo, vazio ou indefinido.`
            );
    }

    static validateArray(array, description) {
        if (!Array.isArray(array))
            throw new ParameterTypeException(
                `Atributo "${description}" deverá ser array.`
            );
    }
}

/* HTTP status codes */
const statusCode = {
    created: 201,
    noContent: 204,
    badRequest: 400,
    notFound: 404,
    conflict: 409,
    internalServerError: 500
};

/* Exceptions */
// test and make them be classes and extend error
function QueryParamNotProvidedException(message) { //remove if not used
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

function RecordAlreadyExistsException(message) {
    this.message = message;
    this.name = RecordAlreadyExistsException.name;
    this.statusCode = statusCode.conflict;
}

function ParameterTypeException(message) {
    this.message = message;
    this.name = ParameterTypeException.name;
    this.statusCode = statusCode.badRequest;
}

function ParameterNotProvidedException(message) {
    this.message = message;
    this.name = ParameterNotProvidedException.name;
    this.statusCode = statusCode.badRequest;
}

function ObjectTypeException(message) {
    this.message = message;
    this.name = ObjectTypeException.name;
    this.statusCode = statusCode.internalServerError;
}

function DuplicateSingletonException(message) {
    this.message = message;
    this.name = DuplicateSingletonException.name;
    this.statusCode = statusCode.internalServerError;
}

class CarrinhoController {
    static instance;
    static carrinhoService;

    constructor() {
        if (this.instance)
            throw new DuplicateSingletonException('Singleton CarrinhoService already exists.');

        this.instance = this;
        this.carrinhoService = CarrinhoService.getInstance();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new CarrinhoController();
        }

        return this.instance;
    }

    registerRoutes(app) {
        app.http('post-carrinho', {
            methods: ['POST'],
            authLevel: 'anonymous',
            route: 'carrinhos',
            handler: async (request, context) => {
                try {
                    return await this.#getPostResponse(request);
                } catch (exception) {
                    return this.#getErrorResponseByException(exception);
                }
            }
        });

        app.http('delete-carrinho', {
            methods: ['DELETE'],
            authLevel: 'anonymous',
            route: 'carrinhos/{compradorId}',
            handler: async (request, context) => {
                try {
                    return await this.#getDeleteResponse(request);
                } catch (exception) {
                    return this.#getErrorResponseByException(exception);
                }
            }
        });

        app.http('put-carrinho', {
            methods: ['PUT'],
            authLevel: 'anonymous',
            route: 'carrinhos/{compradorId}',
            handler: async (request, context) => {
                try {
                    return await this.#getPutResponse(request);
                } catch (exception) {
                    return this.#getErrorResponseByException(exception);
                }
            }
        });

        app.http('get-carrinho', {
            methods: ['GET'],
            authLevel: 'anonymous',
            route: 'carrinhos/{compradorId}',
            handler: async (request, context) => {
                try {
                    return await this.#getGetResponse(request);
                } catch (exception) {
                    return this.#getErrorResponseByException(exception);
                }
            }
        });
    }

    async #getGetResponse(request) {
        const compradorId = Number(request.params.compradorId);
        ValidatorHelper.validateNumberRequired(compradorId, 'compradorId');
        const carrinho = await this.carrinhoService.selectCarrinho(compradorId);

        return { body: JSON.stringify(carrinho) };
    }

    async #getPutResponse(request) {
        const compradorId = Number(request.params.compradorId);
        ValidatorHelper.validateNumberRequired(compradorId, 'compradorId');
        const { produtos } = JSON.parse(await request.text());

        let produtosInstances = [];
        produtos.forEach(produto => {
            const produtoInstance = new ProdutoModel();
            produtoInstance.id = Number(produto.id);
            produtoInstance.titulo = produto.titulo;
            produtoInstance.preco = Number(produto.preco);
            produtoInstance.preco_promocional = Number(produto.preco_promocional);
            produtoInstance.descricao = produto.descricao;
            produtosInstances.push(produtoInstance);
        });

        const carrinhoModel = new CarrinhoModel();
        carrinhoModel.compradorId = Number(compradorId);
        carrinhoModel.produtos = produtosInstances;
        carrinhoModel.validate();

        await this.carrinhoService.updateCarrinho(carrinhoModel);

        return { status: statusCode.noContent };
    }

    async #getDeleteResponse(request) {
        const compradorId = Number(request.params.compradorId);
        ValidatorHelper.validateNumberRequired(compradorId, 'compradorId');
        await this.carrinhoService.deleteCarrinho(compradorId);

        return { status: statusCode.noContent };
    }

    async #getPostResponse(request) {
        const { compradorId, produtos } = JSON.parse(await request.text());

        let produtosInstances = [];
        produtos.forEach(produto => {
            const produtoInstance = new ProdutoModel();
            produtoInstance.id = Number(produto.id);
            produtoInstance.titulo = produto.titulo;
            produtoInstance.preco = Number(produto.preco);
            produtoInstance.preco_promocional = Number(produto.preco_promocional);
            produtoInstance.descricao = produto.descricao;
            produtosInstances.push(produtoInstance);
        });

        const carrinhoModel = new CarrinhoModel();
        carrinhoModel.compradorId = Number(compradorId);
        carrinhoModel.produtos = produtosInstances;
        carrinhoModel.validate();
        await this.carrinhoService.insertCarrinho(carrinhoModel);

        return { status: statusCode.created };
    }

    #getErrorResponseByException(exception) {
        return {
            status: exception.statusCode,
            body: exception.message
        };
    }
}

class ObjectHelper {
    static isObject(value) {
        return typeof (value) === 'object';
    }
}

class CarrinhoService {
    static instance;
    static carrinhoDAO;

    constructor() {
        if (this.instance)
            throw new DuplicateSingletonException('Singleton CarrinhoService already exists.');

        this.instance = this;
        this.carrinhoDAO = CarrinhoDAO.getInstance();
    }

    static getInstance() {
        if (!this.instance)
            this.instance = new CarrinhoService();

        return this.instance;
    }

    async selectCarrinho(compradorId) {
        const carrinho = await this.carrinhoDAO.getOneCarrinhoByCompradorId(compradorId);

        if (!carrinho)
            throw new RecordNotFoundException(
                'Não há carrinho para o "compradorId" informado.'
            );
        
        return carrinho;
    }

    async insertCarrinho(carrinhoModel) {
        const carrinho = await this.carrinhoDAO.getOneCarrinhoByCompradorId(carrinhoModel.compradorId);

        if (carrinho)
            throw new RecordAlreadyExistsException(
                'Carrinho já cadastrado para o usuário informado.'
            );

        await this.carrinhoDAO.postOneCarrinho(carrinhoModel);
    }

    async deleteCarrinho(compradorId) {
        const carrinho = await this.carrinhoDAO.getOneCarrinhoByCompradorId(compradorId);

        if (!carrinho)
            throw new RecordNotFoundException(
                'Não há carrinho para o "compradorId" informado.'
            );

        await this.carrinhoDAO.deleteOneCarrinhoByCompradorId(compradorId);
    }

    async updateCarrinho(carrinhoModel) {
        const carrinho = await this.carrinhoDAO.getOneCarrinhoByCompradorId(carrinhoModel.compradorId);

        if (!carrinho)
            throw new RecordNotFoundException(
                'Não há carrinho para o "compradorId" informado.'
            );

        await this.carrinhoDAO.updateOneCarrinho(carrinhoModel);
    }
}

// checar instanceof do argumento
class CarrinhoDAO {
    static instance;
    static mongoDB;

    constructor() {
        if (this.instance)
            throw new DuplicateSingletonException('Singleton CarrinhoDAO already exists.');

        this.instance = this;
        this.mongoDB = MongoDB.getInstance();
    }

    static getInstance() {
        if (!this.instance)
            this.instance = new CarrinhoDAO();

        return this.instance;
    }

    async updateOneCarrinho(carrinhoModel) {
        const query = { compradorId: carrinhoModel.compradorId };

        const updateDocument = {
            $set: {
                produtos: carrinhoModel.produtos,
            },
        };

        await this.mongoDB.executeDatabaseCommand(mongoDbCollection =>
            mongoDbCollection.updateOne(query, updateDocument)
        );
    }

    async getOneCarrinhoByCompradorId(compradorId) {
        const query = { compradorId: compradorId };

        return await this.mongoDB.executeDatabaseCommand(mongoDbCollection =>
            mongoDbCollection.findOne(query)
        );
    }

    async deleteOneCarrinhoByCompradorId(compradorId) {
        const query = { compradorId: compradorId };

        await this.mongoDB.executeDatabaseCommand(mongoDbCollection =>
            mongoDbCollection.deleteOne(query)
        );
    }

    async postOneCarrinho(carrinho) {
        await this.mongoDB.executeDatabaseCommand(mongoDbCollection =>
            mongoDbCollection.insertOne(carrinho)
        );
    }
}

class MongoDB {
    static URI = "mongodb+srv://carloskrefer:3AFSiTE3n8EY0Q7Q@chestplace.pvyxw.mongodb.net/?retryWrites=true&w=majority&appName=chestplace";
    static CLIENT = new MongoClient(MongoDB.URI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    static DATABASE_NAME = "chestplace";
    static COLLECTION_NAME = "carrinhos";

    static instance;

    constructor() {
        if (this.instance)
            throw new DuplicateSingletonException('Singleton MongoDB already exists.');

        this.instance = this;
    }

    static getInstance() {
        if (!this.instance)
            this.instance = new MongoDB();

        return this.instance;
    }

    async executeDatabaseCommand(callback) {
        try {
            await MongoDB.CLIENT.connect();
            const database = MongoDB.CLIENT.db(MongoDB.DATABASE_NAME);
            const collection = database.collection(MongoDB.COLLECTION_NAME);
            return await callback(collection);
        } catch (exception) {
            const message =
                'Ocorreu um erro durante a conexão com o banco de dados: '
                + exception.message;
            throw new DatabaseConnectionException(message);
        } finally {
            await MongoDB.CLIENT.close();
        }
    }
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

CarrinhoController.getInstance().registerRoutes(app);
