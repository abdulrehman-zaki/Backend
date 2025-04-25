import { Router } from "express"; 
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.js"

const router = Router()


router.route("/register").post(upload.fields([
    {
        name:"avatar",
        maxCount: 1
    },
    {
        name:"coverImage",
        maxCount:1
    }
]),registerUser)


export default router




















///////////////////////////////////////////////////////////////////

//////////////////////////SEE YA TOMORROW/////////////////////////

/////////////////////////DATED 25/04/2025////////////////////////

/////////////////////////Time: 01:00 AM/////////////////////////

///////////////////////////////////////////////////////////////



 