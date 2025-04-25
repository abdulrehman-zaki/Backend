import asyncHandler from "../utils/asynchandlers.js"
import {ApiError} from "../utils/ApiErrors.js"
import {User} from "../models/user.moodel.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler (async(req,res)=>{
   const {fullname,username,email,password} = req.body
    console.log("email",email)

    if (
        [fullname,email,username,password].some((fields)=>
        fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const exictedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(exictedUser){
        throw new ApiError(409,"User with username or email already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;;
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath) {
        throw new error(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(409,"User with username or email already existed")
    }

   const user = await User.create(
        {
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) 
        throw new ApiError(500,"Something went wronng while creating user")

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registerd successfuly")
    )

}) 

export {registerUser}