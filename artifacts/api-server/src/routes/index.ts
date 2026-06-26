import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicTicketsRouter from "./tickets-public";
import staffTicketsRouter from "./tickets-staff";
import staffRouter from "./staff";
import updatesRouter from "./updates";

const router: IRouter = Router();

router.use(healthRouter);

// Public ticket routes: POST /api/tickets, POST /api/tickets/track
router.use("/tickets", publicTicketsRouter);

// Staff auth + members + dashboard
router.use("/staff", staffRouter);

// Staff ticket management: /api/staff/tickets/*
router.use("/staff/tickets", staffTicketsRouter);

// Public updates: GET /api/updates, GET /api/updates/:id
router.use("/updates", updatesRouter);

// Staff update management: /api/staff/updates
router.use("/staff/updates", updatesRouter);

export default router;
