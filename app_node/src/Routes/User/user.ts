import express from "express";
import extractJWT from "../../Middlewares/extractJWT";
import controller from "../../Controllers/User/user";
import expressAsyncHandler from "express-async-handler";

const router = express.Router();

router.get("/validate", extractJWT, controller.validateToken);
router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/resetPasswordRequest", expressAsyncHandler(controller.resetPasswordRequest));
router.post("/resetPassword", expressAsyncHandler(controller.resetPassword));

export default router;
