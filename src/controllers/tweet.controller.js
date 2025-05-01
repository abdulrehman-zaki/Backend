import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandlers.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required for tweet")
    }
    
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })
    
    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet")
    }
    
    return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    
    const user = await User.findById(userId)
    
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 }
    }
    
    const tweets = await Tweet.aggregatePaginate(
        Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$owner"
            },
            {
                $project: {
                    content: 1,
                    owner: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]),
        options
    )
    
    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required for tweet")
    }
    
    const tweet = await Tweet.findById(tweetId)
    
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own tweets")
    }
    
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )
    
    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    
    const tweet = await Tweet.findById(tweetId)
    
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own tweets")
    }
    
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    
    if (!deletedTweet) {
        throw new ApiError(500, "Failed to delete tweet")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}