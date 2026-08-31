import { Router } from "express";
import {
  getStudentRank,
  getStudentWeeklyStanding,
  updateStudentProfile,
} from "../controllers/studentController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { getStudentEvents, registerForEvent } from "../controllers/eventController";
import {
  getStudentWeeklyContests,
  openStudentWeeklyContest,
} from "../controllers/weeklyContestController";

const router = Router();

router.use(authenticate, authorize("student"));

router.get("/weekly-rank", getStudentWeeklyStanding);
router.get("/rank", getStudentRank);
router.get("/events", getStudentEvents);
router.post("/events/:eventId/register", registerForEvent);
router.get("/weekly-contests", getStudentWeeklyContests);
router.post("/weekly-contests/:contestId/open", openStudentWeeklyContest);
router.patch("/profile", updateStudentProfile);

export default router;
