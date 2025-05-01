import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandlers.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user?._id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    let like
    if (existingLike) {
        // Unlike if already liked
        like = await Like.findByIdAndDelete(existingLike._id)
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"))
    } else {
        // Like if not already liked
        like = await Like.create({
            video: videoId,
            likedBy: userId
        })
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    let like
    if (existingLike) {
        // Unlike if already liked
        like = await Like.findByIdAndDelete(existingLike._id)
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"))
    } else {
        // Like if not already liked
        like = await Like.create({
            comment: commentId,
            likedBy: userId
        })
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    let like
    if (existingLike) {
        // Unlike if already liked
        like = await Like.findByIdAndDelete(existingLike._id)
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"))
    } else {
        // Like if not already liked
        like = await Like.create({
            tweet: tweetId,
            likedBy: userId
        })
        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"))
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const { page = 1, limit = 10 } = req.query

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
    }

    const likedVideos = await Like.aggregatePaginate(
        Like.aggregate([
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(userId),
                    video: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "video",
                    pipeline: [
                        {
                            $match: {
                                isPublished: true
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
                                title: 1,
                                description: 1,
                                duration: 1,
                                views: 1,
                                thumbnail: 1,
                                owner: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$video"
            },
            {
                $project: {
                    video: 1,
                    likedAt: "$createdAt"
                }
            }
        ]),
        options
    )

    return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}