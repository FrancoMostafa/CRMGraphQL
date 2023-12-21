const mongoose = require('mongoose')

const ProductosSchema = mongoose.Schema({
    nombre: {
        type: String,
        require: true,
        trim: true
    },
    precio: {
        type: Number,
        requiere: true,
        trim: true
    },
    existencia: {
        type: Number,
        require: true,
        trim: true
    },
    creado: {
        type: Date,
        default: Date.now()
    }

})

ProductosSchema.index({nombre: 'text'})

module.exports = mongoose.model('Producto', ProductosSchema)