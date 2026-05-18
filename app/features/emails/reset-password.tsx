import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface ResetPasswordEmailProps {
  userName: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ userName, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Reset your Feediyo password</Preview>
        <Body className="bg-zinc-100 m-0 py-10 font-sans">
          <Container className="max-w-[560px] mx-auto bg-white rounded-xl p-10 border border-zinc-200">
            <Text className="m-0 mb-2 text-[22px] font-semibold text-zinc-900 leading-tight">
              Reset your password
            </Text>

            <Text className="m-0 mb-7 text-sm text-zinc-500 leading-relaxed">
              Hi <strong className="text-zinc-700">{userName}</strong>, we received a request to
              reset your Feediyo account password. Click the button below to choose a new one.
            </Text>

            <Section className="mb-7">
              <Button
                href={resetUrl}
                className="bg-zinc-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg no-underline"
              >
                Reset password
              </Button>
            </Section>

            <Text className="m-0 mb-7 text-xs text-zinc-400 leading-relaxed">
              Or copy this link into your browser:
              <br />
              <Link href={resetUrl} className="text-zinc-500 break-all">
                {resetUrl}
              </Link>
            </Text>

            <Hr className="my-7 border-none border-t border-zinc-200" />

            <Text className="m-0 text-xs text-zinc-400">
              This link expires in 1 hour. If you didn't request a password reset, you can safely
              ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
