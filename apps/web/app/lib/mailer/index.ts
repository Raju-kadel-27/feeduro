import { sendEmailDev } from "./dev";
import { sendEmailSandbox } from "./sandbox";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (process.env.ENVIRONMENT === "development") {
    return sendEmailDev(options);
  }
  return sendEmailSandbox(options);
}
