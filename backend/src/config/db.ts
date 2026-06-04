import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  mongoose.connection.on("connected", () =>
    console.log("✅  MongoDB connected:", env.MONGODB_URI)
  );
  mongoose.connection.on("error", (err) =>
    console.error("❌  MongoDB error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️   MongoDB disconnected")
  );

  await mongoose.connect(env.MONGODB_URI);
}
