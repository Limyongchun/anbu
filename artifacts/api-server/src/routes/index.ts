import { Router, type IRouter } from "express";
import healthRouter from "./health";
import familyRouter from "./family";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(familyRouter);
router.use(authRouter);

export default router;
