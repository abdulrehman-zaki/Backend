import connectDB from "./db/index.js";
import dotenv from "dotenv";
import app from "./app.js"

dotenv.config({
    path : "./env"
})


connectDB()

.then(()=>{
    app.on("error",(error)=>{
        console.log(`ERROR OCCURS AT MONGODB CONNECTION:`,error)
        throw error

    })
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`App is listening on Port: ${process.env.PORT || 8000}`)
    })
})
.catch((error)=>{
    console.log(`MOngoDb connction failed` , error)
})









/*
import express from "express";

const app = express()

(async()=>{

    try {
        await mongoose.connect (`${process.env.MONGODB_URI} / ${DB_NAME} `)
        app.on("error", (error) =>{
            console.log("ERROR OCCURS", error)
            throw error
        } )

        app.listen (process.env.PORT, ()=>{
            console.log(`App is listening on Port: ${process.env.PORT}`)

        })
    } catch (error) {
        console.log("Error: ", error)
        throw error
    }

})()


*/