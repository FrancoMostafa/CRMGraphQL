const Usuario = require('../models/Usuario')
const Producto = require('../models/Producto')
const Cliente = require('../models/Cliente')
const Pedido = require('../models/Pedido')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')

const crearToken = (usuario, secreta, expiresIn) => {
    const {id, email, nombre, apellido} = usuario
    return jwt.sign( { id, email, nombre, apellido }, secreta, { expiresIn } )
}

// Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_,{  }, context) => {
            return context.usuario
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
                // revisar
                const producto = await Producto.findById(id)
                if(!producto) {
                    throw new Error("Producto no encontrado")
                }
                return producto
        },
        obtenerClientes: async () => {     
            try {
                const clintes = await Cliente.find({})
                return clintes
            } catch(e) {
                console.log(e)
            }
        },
        obtenerClientesVendedor: async (_,{},ctx) => {
            try {
                const clintes = await Cliente.find({ vendedor: ctx.usuario.id.toString() })
                return clintes
            } catch(e) {
                console.log(e)
            }
        },
        obtenerCliente: async (_,{id},ctx) => {
            // revisar si existe
            const cliente = await Cliente.findById(id)

            if (!cliente) {
                throw new Error("Cliente no encontrado")
            }

            // lo ve quien lo creo
            if (cliente.vendedor.toString() !== ctx.usuario.id.toString()) {
                throw new Error("Credenciales invalidas")
            }

            return cliente
        },
        obtenerPedidos: async () => {     
            try {
                const pedidos = await Pedido.find({})
                return pedidos
            } catch(e) {
                console.log(e)
            }
        },
        obtenerPedidosDeVendedor: async (_,{},ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id}).populate('cliente')
                return pedidos
            } catch(e) {
                console.log(e)
            }
        },
        obtenerPedido: async (_,{id},ctx) => {
            // revisar si existe
            const pedido = await Pedido.findById(id)

            if (!pedido) {
                throw new Error("Pedido no encontrado")
            }

            // lo ve quien lo creo
            if (pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error("Credenciales invalidas")
            }

            return pedido
        },
        obtenerPedidosConEstado: async (_,{estado},ctx) => {
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado: estado})
            return pedidos
        },
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match : {estado : "COMPLETADO"} },
                { $group : {_id: "$cliente", 
                total: {$sum: '$total'}}},
                {$lookup: {from: 'clientes', localField: '_id', foreignField: "_id", as: "cliente"}},
                {$sort: {total: -1}
        }])
            return clientes
        },
        mejoresVendedores: async () => {
            const vendedores = await Pedido.aggregate([
                { $match : {estado : "COMPLETADO"} },
                { $group : {_id: "$vendedor", 
                total: {$sum: '$total'}}},
                {$lookup: {from: 'usuarios', localField: '_id', foreignField: "_id", as: "vendedor"}},
                {$limit: 3},
                {$sort: {total: -1}
        }])
            return vendedores
        },
        buscarProducto: async (_, {texto}) => {
            const productos = await Producto.find({$text: {$search: texto}}).limit(10)
            return productos
        }
    },

    Mutation: {
        nuevoUsuario: async (_, { input }) => {
            
            const {email, password} = input
            
            // Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({email})

            if(existeUsuario) {
                throw new Error("Usuario ya registrado")
            }
            // Hashear su password
            const salt = await bcryptjs.genSalt(10)
            input.password = await bcryptjs.hash(password, salt)


            try {
                const usuario = new Usuario(input)
                usuario.save()// Guardar en base de datos
                return usuario
            } catch(e) {
                console.log(e)
            }

            return "Creando..."
        },
        autenticarUsuario: async (_, {input}) => {
            const {email, password} = input

            // si el usuario existe
            const existeUsuario = await Usuario.findOne({email})
            if(!existeUsuario) {
                throw new Error("El usuario no existe")
            }

            // revisar password

            // crear token
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)
            if(!passwordCorrecto) {
                throw new Error("Password incorrecto")
            }

            return{ token: crearToken(existeUsuario, process.env.SECRETA, '24h') }
        },
        nuevoProducto: async (_, {input}) => {
            try {
                const nuevoProducto = new Producto(input)

                // save
                const resultado = await nuevoProducto.save()

                return resultado
            } catch (error) {
                console.log(error)
            }

        },
        actualizarProducto: async (_, {id,input}) => {
                // revisar
                let producto = await Producto.findById(id)

                if(!producto) {
                    throw new Error("Producto no encontrado")
                } else {
                    producto = Producto.findOneAndUpdate({_id: id}, input, {new: true})
                }

                return producto

        },
        eliminarProducto: async (_, {id}) => {
            // revisar
            let producto = await Producto.findById(id)

            if(!producto) {
                throw new Error("Producto no encontrado")
            } else {
                await Producto.findOneAndDelete({_id: id})
            }

            return "Producto Eliminado"

        },
        nuevoCliente: async (_, {input}, ctx) => {     
            
            // Revisar si el usuario ya esta registrado
            const {email} = input
            const existeCliente = await Cliente.findOne({email})

            if(existeCliente) {
                throw new Error("Cliente ya registrado")
            }

            let nuevoCliente = new Cliente(input)

            // Asignar vendedor
            nuevoCliente.vendedor = ctx.usuario.id

            try {
                const res = await nuevoCliente.save()// Guardar en base de datos
                return res
            } catch(e) {
                console.log(e)
            }

            return "Creando..."

        },
        actualizarCliente: async (_, {id,input}, ctx) => {

            // Revisar si el cliente ya esta registrado
            let cliente = await Cliente.findById(id)

            if(!cliente) {
                throw new Error("Cliente no registrado")
            }

            if (cliente.vendedor.toString() !== ctx.usuario.id.toString()) {
                throw new Error("Credenciales invalidas")
            }

            const res = Cliente.findOneAndUpdate({_id: id}, input, {new: true})

            return res

        },
        eliminarCliente: async (_, {id}, ctx) => {
            // revisar
            let cliente = await Cliente.findById(id)

            if(!cliente) {
                throw new Error("Cliente no encontrado")
            } 
            
            if (cliente.vendedor.toString() !== ctx.usuario.id.toString()) {
                throw new Error("Credenciales invalidas")
            }

            await Cliente.findOneAndDelete({_id: id})

            return "Cliente Eliminado"

        },
        nuevoPedido: async (_, {input}, ctx) => {
            try {
            // verificar cliente
            const {cliente} = input

            const clienteExiste = await Cliente.findById(cliente)

            if(!clienteExiste) {
                throw new Error("Cliente no encontrado")
            } 
            
            // verificar si cliente es del vendedor
            if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error("Credenciales invalidas")
            }

            // revisar stock
            input.pedido.forEach(async a => {
                const {id} = a
                const producto = await Producto.findById(id)

                if (a.cantidad > producto.existencia) {
                    throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`)
                } else {
                    // restar cantidad a disponible
                    producto.existencia -= a.cantidad
                    await producto.save()
                }
            });

            // crear nuevo pedido
            const nuevoPedido = new Pedido(input)

            // asignar vendedor
            nuevoPedido.vendedor = ctx.usuario.id

            // guardar en DB
            const res = await nuevoPedido.save()
            return res
            } catch(e) {
                console.log(e)
            }
        },
        actualizarPedido: async (_, {id,input}, ctx) => {

            const {cliente} = input
            // PedidoExiste
            let existePedido = await Pedido.findById(id)
            let existeCliente = await Cliente.findById(cliente)

            if(!existePedido) {
                throw new Error("Pedido no existe")
            } else if(!existeCliente) {
                throw new Error("Cliente no existe")
            } else if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error("Credenciales invalidas")
            } else {

                
            // revisar stock
            input.pedido.forEach(async a => {
                const {id} = a
                const producto = await Producto.findById(id)

                if (a.cantidad > producto.existencia) {
                    throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`)
                } else {
                    // restar cantidad a disponible
                    producto.existencia -= a.cantidad
                    await producto.save()
                }
            });

            
            const res = await Pedido.findOneAndUpdate({_id: id}, input, {new: true})

            return res

            }

        },
        eliminarPedido: async (_, {id}, ctx) => {
            // revisar
            let pedido = await Pedido.findById(id)

            if(!pedido) {
                throw new Error("Pedido no encontrado")
            } 
            
            if (pedido.vendedor.toString() !== ctx.usuario.id.toString()) {
                throw new Error("Credenciales invalidas")
            }

            await Pedido.findOneAndDelete({_id: id})

            return "Pedido Eliminado"

        }
    }
}

module.exports = resolvers