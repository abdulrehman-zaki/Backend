import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandlers.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id
    
    // Get total subscribers count
    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    })
    
    // Get all videos uploaded by the channel
    const videos = await Video.find({ owner: userId })
    
    // Calculate total video views
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0)
    
    // Get total videos count
    const totalVideos = videos.length
    
    // Get total likes on all videos
    const videoIds = videos.map(video => video._id)
    const totalLikes = await Like.countDocuments({
        video: { $in: videoIds },
        liked: true
    })
    
    // Prepare the stats object
    const stats = {
        totalSubscribers,
        totalViews,
        totalVideos,
        totalLikes
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const userId = req.user?._id
    
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                isPublished: {
                    $ifNull: ["$isPublished", true]
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                isPublished: 1,
                likesCount: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])
    
    if (!videos || videos.length === 0) {
        throw new ApiError(404, "No videos found for this channel")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
}