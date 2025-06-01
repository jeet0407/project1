import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "something went wrong while generatig generate and refresh token"
        );
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation of each field
    //check if user already exists: username or email
    //check for images , avatar
    //upload to cloudinary
    //create user object in database
    //remove password and refresh token field
    //check for user creation
    //send response back to frontend

    const { fullname, email, username, password } = req.body;

    if ([fullname, email, username, password].some((field) => !field)) {
        throw new ApiError(400, "all fiels are required");
    }

    const userExist = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (userExist) {
        throw new ApiError(
            409,
            "user already exists with this email or username"
        );
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(401, "avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new ApiError(400, "avatar is not uploaded on db");
    }

    const user = await User.create({
        fullname,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //as it is a optional field user might not give it
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "user not created in db");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "user created successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "usename or password is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "user does not exist");
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);

    if (!isPasswordMatched) {
        throw new ApiError(401, "password is incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "user logged in successfully"
            )
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized: refresh token is missing");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.JWT_REFRESH_TOKEN
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "user not found for refresh token");
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(
                401,
                "unauthorized: refresh token is not matched must be expired "
            );
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);
        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "unauthorized: refresh token error"
        );
    }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user details"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
            },
        },
        { new: true }
    ).select(" -password ");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "account details updated successfully")
        );
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                avatar : avatar.url,
            },
        }, 
        {new : true}
    ).select("-password"); 

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                coverImage : coverImage.url,
            },
        }, 
        {new : true}
    ).select("-password"); 

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));

});

export const getUserChannelProfile = asyncHandler(async(req , res) => {
    const {username} =  req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        { // to get number of subscribers
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscribers",
                as : "subscribeTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribeToCount : {
                    $size : "$subscribeTo"
                },
                isSubscribed : {
                    $cond : {
                        if: {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false,
                    }
                }
                
            }
        },
        {
            $project : {
                fullname : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribeToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1,
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200 , channel[0] , "channel profile details fetched successfully"));
})