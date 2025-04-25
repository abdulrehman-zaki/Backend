const asyncHandler = (requestHandler) =>{  //This is a higher-order function: a function that takes another function (requestHandler) as an argument.requestHandler is expected to be an async function, like an Express route or middleware.
        return (req, res, next) =>{     //This line returns a new middleware function that takes the usual req, res, and next parameters.This function will be called by Express when a matching route is hit.
        Promise.resolve(requestHandler(req,res,next)).//We call the requestHandler with the Express parameters.If the requestHandler is async, it returns a Promise.Promise.resolve(...) ensures we’re always dealing with a Promise (even if someone passed a non-async function by mistake).
        catch((err) => next (err))  //If the requestHandler throws an error or the Promise is rejected, this .catch catches it.The error is passed to next(err), which is how Express forwards errors to your error-handling middleware.        
    }
}
export default asyncHandler