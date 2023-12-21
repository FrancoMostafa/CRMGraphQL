const { ApolloServer } = require('apollo-server');
const resolvers = require('./db/resolvers');
const typeDefs = require('./db/schema');
const connectDB = require('./config/db')
const jwt = require('jsonwebtoken')

// conectar DB
connectDB()

// servidor
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => {
        const token = req.headers['authorization'] || ''
        if(token) {
            try {
                const usuario = jwt.verify(token.replace('Bearer ',''), process.env.SECRETA)
                return { usuario }
            } catch (error) {
                console.log(error)
            }
        }
    }
});

// start server
server.listen({port: process.env.PORT || 4000}).then(({url}) => {
    console.log(`Servidor listo en la URL ${url}`)
})