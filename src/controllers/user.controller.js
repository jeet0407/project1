import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";

export const registerUser = asyncHandler(async(req, res) => {

    //get user details from frontend
    //validation of each field
    //check if user already exists: username or email
    //check for images , avatar
    //upload to cloudinary
    //create user object in database
    //remove password and refresh token field
    //check for user creation
    //send response back to frontend

    const { fullname , email , username , password } = req.body

    if([fullname , email , username , password].some(field => !field)){
        throw new ApiError(400 , "all fiels are required")
    }

    const userExist = await User.findOne({
        $or: [ { email } , { username } ]
    })

    if(userExist){
        throw new ApiError(409, "user already exists with this email or username")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)


    let coverImage = null
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if(!avatar){
        throw new ApiError(400, "avatar is not uploaded on db")
    }

    const user = await User.create({
        fullname,
        email,
        avatar : avatar.url,
        coverImage: coverImage?.url || "", //as it is a optional field user might not give it
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "user not created in db")
    }

    return res.status(201).json(
        new ApiResponse(200, 
            createdUser, 
            "user created successfully", 
        )
    )
})