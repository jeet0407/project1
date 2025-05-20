import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import express from 'express';
const app = express();

const connectDB = async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        
        console.log(`\n Connected to MongoDB!!`);

        app.listen(process.env.PORT , () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    } catch(error){
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

export default connectDB;