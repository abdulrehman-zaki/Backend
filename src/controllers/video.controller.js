import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandlers.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    const pipeline = []
    
    // For using Full Text based search
    if (query) {
        pipeline.push({
            $match: {
                $text: {
                    $search: query
                }
            }
        })
    }
    
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user id")
        }
        
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }
    
    // Add default isPublished filter to show only published videos
    pipeline.push({
        $match: {
            isPublished: true
        }
    })
    
    // Sorting
    if (sortBy && sortType) {
        const sort = {}
        sort[sortBy] = sortType === "asc" ? 1 : -1
        pipeline.push({ $sort: sort })
    } else {
        pipeline.push({ $sort: { createdAt: -1 } })
    }
    
    pipeline.push(
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
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile": 1,
                "thumbnail": 1,
                "title": 1,
                "description": 1,
                "duration": 1,
                "views": 1,
                "isPublished": 1,
                "owner": 1,
                "likesCount": 1,
                "isLiked": 1,
                "createdAt": 1
            }
        }
    )
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    
    const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), options)
    
    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }
    
    const videoFileLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    
    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }
    
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    
    if (!videoFile) {
        throw new ApiError(400, "Video file upload failed")
    }
    
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail upload failed")
    }
    
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            publicId: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            publicId: thumbnail.public_id
        },
        owner: req.user._id,
        isPublished: true
    })
    
    const createdVideo = await Video.findById(video._id)
    
    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while publishing the video")
    }
    
    return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    
    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    })
    
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile": 1,
                "thumbnail": 1,
                "title": 1,
                "description": 1,
                "duration": 1,
                "views": 1,
                "isPublished": 1,
                "owner": 1,
                "likesCount": 1,
                "isLiked": 1,
                "createdAt": 1
            }
        }
    ])
    
    if (!video || video.length === 0) {
        throw new ApiError(404, "Video not found")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }
    
    const thumbnailLocalPath = req.file?.path
    
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video")
    }
    
    let thumbnail
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        
        if (!thumbnail) {
            throw new ApiError(400, "Thumbnail upload failed")
        }
        
        // Delete old thumbnail from Cloudinary
        await deleteFromCloudinary(video.thumbnail.publicId)
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                ...(thumbnail && {
                    thumbnail: {
                        url: thumbnail.url,
                        publicId: thumbnail.public_id
                    }
                })
            }
        },
        { new: true }
    )
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video")
    }
    
    // Delete video and thumbnail from Cloudinary
    await deleteFromCloudinary(video.videoFile.publicId)
    await deleteFromCloudinary(video.thumbnail.publicId)
    
    await Video.findByIdAndDelete(videoId)
    
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to toggle publish status")
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    )
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { isPublished: updatedVideo.isPublished },
            "Publish status toggled successfully"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}