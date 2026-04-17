import express from "express";
import { clerkWebhooks, createTestUser } from "../controllers/UserController.js";

const userRouter = express.Router()

userRouter.get("/test-write", createTestUser)
userRouter.post("/webhooks", clerkWebhooks)

export default userRouter;
