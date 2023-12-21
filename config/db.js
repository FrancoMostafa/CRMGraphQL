const mongoose = require('mongoose')
require('dotenv').config({path: 'variables.env'})

const connectDB = async (retries = 0) => {
    try {

        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.DB_MONGO, {
        })
        console.log('DB connect')

    } catch (error) {

        if (retries >= 2) {
            console.log('error in connect DB')
            console.log(error)
            process.exit(1)
        } else {
            console.log(`retry number: ${retries + 1}`)
            connectDB(retries += 1)
        }

    }
}

module.exports = connectDB