import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import express from 'express';
const app = express();

const connectDB = async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        
        console.log(`\n Connected to MongoDB!!`);
    } catch(error){
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

export default connectDB;