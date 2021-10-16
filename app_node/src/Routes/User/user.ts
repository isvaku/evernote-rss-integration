import express from "express";
import extractJWT from "../../Middlewares/extractJWT";
import controller from "../../Controllers/User/user";

const router = express.Router();

router.get("/validate", extractJWT, controller.validateToken);
router.post("/register", controller.register);
router.post("/login", controller.login);

export default router;
