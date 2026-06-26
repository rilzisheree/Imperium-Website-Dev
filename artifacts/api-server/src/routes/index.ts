import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicTicketsRouter from "./tickets-public";
import staffTicketsRouter from "./tickets-staff";
import staffRouter from "./staff";
import updatesRouter from "./updates";
import cmsRouter from "./cms";

const router: IRouter = Router();

router.use(healthRouter);

// Public ticket routes
router.use("/tickets", publicTicketsRouter);

// Staff auth + members + dashboard + logs
router.use("/staff", staffRouter);

// Staff ticket management
router.use("/staff/tickets", staffTicketsRouter);

// Public updates
router.use("/updates", updatesRouter);

// Staff update management
router.use("/staff/updates", updatesRouter);

// CMS content (public read + staff write)
router.use("/cms", cmsRouter);

export default router;
