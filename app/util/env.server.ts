import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["production", "development", "test"] as const),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_KEY: z.string(),
  CLOUDINARY_SECRET: z.string(),
  CLOUDINARY_LEGACY_URL: z.string().url(),
  HONEYPOT_SECRET: z.string(),
  SESSION_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}

export function init() {
  const parsed = schema.safeParse(process.env);

  if (parsed.success === false) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );

    throw new Error("Invalid envirmonment variables");
  }
}

export function getEnv() {
  return {
    MODE: process.env.NODE_ENV,
  };
}

type ENV = ReturnType<typeof getEnv>;

declare global {
  var ENV: ENV;
  interface Window {
    ENV: ENV;
  }
}
