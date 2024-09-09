import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async()=>{
    const uri = process.env.MONGODB_URI
    try {
        const connectionInstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`MongoDB Connected!!! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB Connection Error: ", error);
        console.log("URL: ", uri);
        process.exit(1);
    }
}

export default connectDB;