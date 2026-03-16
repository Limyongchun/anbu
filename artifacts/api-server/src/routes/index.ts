import { Router, type IRouter } from "express";
import healthRouter from "./health";
import familyRouter from "./family";
import authRouter from "./auth";
import qrRouter from "./qr";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(familyRouter);
router.use(authRouter);
router.use(qrRouter);
router.use(adminRouter);

export default router;
