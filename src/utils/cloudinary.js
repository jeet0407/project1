import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath){
            throw new Error("No file path provided for upload.");
        }

        //upload file on cloudinary
        const response = await cloudinary.upldoader.upload(localFilePath , {
            resource_type: "auto",
        })

        console.log("File uploaded to Cloudinary:", response.url);
        return response;

    } catch(error){
        fs.unlinkSync(localFilePath); // Clean up the local file
        console.error("Error uploading file to Cloudinary:", error);
        throw error;
    }
} 

export default uploadOnCloudinary;
