import { Router, type IRouter } from "express";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import { getSettings, updateSettings } from "../lib/settings";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const next = await updateSettings(parsed.data);
  res.json(GetSettingsResponse.parse(next));
});

export default router;
