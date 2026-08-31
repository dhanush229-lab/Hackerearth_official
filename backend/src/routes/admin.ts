import { Router } from "express";
import {
  awardStudentPoints,
  getAdminOverview,
  getRegistrationSettings,
  getStudentPointHistory,
  getStudents,
  exportStudents,
  clearStudentPasswordResetLimit,
  updateRegistrationSettings,
  updateManualPointTransaction,
  updateStudentStatus,
} from "../controllers/adminController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createAdminEvent,
  getAdminEvent,
  getAdminEventRegistrations,
  getAdminEvents,
  exportAdminEventRegistrations,
  uploadAdminEventPoster,
  updateAdminEvent,
} from "../controllers/eventController";
import { uploadEventPosterMiddleware } from "../middleware/eventPosterUpload";
import {
  createAdminWeeklyContest,
  exportAdminWeeklyContestAttempts,
  getAdminWeeklyContestAttempts,
  getAdminWeeklyContests,
  updateAdminWeeklyContest,
  upsertAdminWeeklyContestScore,
} from "../controllers/weeklyContestController";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/overview", getAdminOverview);
router.post("/events/poster", uploadEventPosterMiddleware, uploadAdminEventPoster);
router.post("/events", createAdminEvent);
router.get("/events", getAdminEvents);
router.get("/events/:eventId/registrations/export", exportAdminEventRegistrations);
router.get("/events/:eventId/registrations", getAdminEventRegistrations);
router.get("/events/:eventId", getAdminEvent);
router.patch("/events/:eventId", updateAdminEvent);
router.post("/weekly-contests", createAdminWeeklyContest);
router.get("/weekly-contests", getAdminWeeklyContests);
router.get(
  "/weekly-contests/:contestId/attempts/export",
  exportAdminWeeklyContestAttempts
);
router.get("/weekly-contests/:contestId/attempts", getAdminWeeklyContestAttempts);
router.put(
  "/weekly-contests/:contestId/students/:studentId/score",
  upsertAdminWeeklyContestScore
);
router.patch("/weekly-contests/:contestId", updateAdminWeeklyContest);
router.get("/students", getStudents);
router.get("/students/export", exportStudents);
router.post("/leaderboard/points", awardStudentPoints);
router.patch("/leaderboard/points/:transactionId", updateManualPointTransaction);
router.get("/leaderboard/students/:studentId/points", getStudentPointHistory);
router.patch("/students/:studentId/status", updateStudentStatus);
router.patch(
  "/students/:studentId/password-reset-limit",
  clearStudentPasswordResetLimit
);
router.get("/settings/registration", getRegistrationSettings);
router.patch("/settings/registration", updateRegistrationSettings);

export default router;
