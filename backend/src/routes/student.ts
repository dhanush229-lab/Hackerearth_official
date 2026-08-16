import { Router } from "express";
import {
  getStudentDomainGroups,
  updateStudentProfile,
} from "../controllers/studentController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.use(authenticate, authorize("student"));

router.get("/domain-groups", getStudentDomainGroups);
router.patch("/profile", updateStudentProfile);

export default router;
