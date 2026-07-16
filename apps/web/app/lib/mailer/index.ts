import { sendEmailDev } from "./dev";
import { sendEmailProd } from "./prod";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (process.env.ENVIRONMENT === "development") {
    return sendEmailDev(options);
  }
  return sendEmailProd(options);
}
