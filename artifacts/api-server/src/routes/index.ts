import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import devicesRouter from "./devices";
import telemetryRouter from "./telemetry";
import campaignsRouter from "./campaigns";
import adAssetsRouter from "./ad-assets";
import dynamicContentRouter from "./dynamic-content";
import proofOfPlaysRouter from "./proof-of-plays";
import sosAlertsRouter from "./sos-alerts";
import playlistRouter from "./playlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(devicesRouter);
router.use(telemetryRouter);
router.use(campaignsRouter);
router.use(adAssetsRouter);
router.use(dynamicContentRouter);
router.use(proofOfPlaysRouter);
router.use(sosAlertsRouter);
router.use(playlistRouter);

export default router;
