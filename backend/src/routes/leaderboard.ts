import { Router } from "express";
import {
  getOverallLeaderboardHandler,
  getWeeklyContestWeeksHandler,
  getWeeklyLeaderboardHandler,
} from "../controllers/leaderboardController";

const router = Router();

router.get("/overall", getOverallLeaderboardHandler);
router.get("/weekly", getWeeklyLeaderboardHandler);
router.get("/weeks", getWeeklyContestWeeksHandler);

export default router;
