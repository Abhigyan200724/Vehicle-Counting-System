
import express from "express";

import {
  createLiveSession,
  getLiveSessions,
  getLiveSessionById,
  deleteLiveSession
} from "../controllers/liveSessionController.js";

const router = express.Router();

router.post("/", createLiveSession);
router.get("/", getLiveSessions);
router.get("/:id", getLiveSessionById);
router.delete("/:id", deleteLiveSession);

export default router;
