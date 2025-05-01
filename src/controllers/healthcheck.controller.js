import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandlers.js"

const healthcheck = asyncHandler(async (req, res) => {
    // Build healthcheck response
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { status: "OK" },
            "Service is healthy and running normally"
        )
    )
})

export {
    healthcheck
}