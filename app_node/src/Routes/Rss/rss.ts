import express from "express";
import extractJWT from "../../Middlewares/extractJWT";
import controller from "../../Controllers/Rss/rss";

const router = express.Router();

router.post("/add", extractJWT, controller.create);
router.patch("/update", extractJWT, controller.update);
router.delete("/remove", extractJWT, controller.remove);
router.get("/insertEntriesFromFeed", controller.insertEntriesFromFeed);
router.get("/createNotesFromEntries", controller.createNotesFromEntries);

export default router;
