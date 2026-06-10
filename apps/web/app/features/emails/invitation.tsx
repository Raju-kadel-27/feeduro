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

interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}

export function InvitationEmail({
  inviterName,
  inviterEmail,
  workspaceName,
  role,
  acceptUrl,
}: InvitationEmailProps) {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          {inviterName} invited you to join {workspaceName} on Feeduro
        </Preview>
        <Body className="bg-zinc-100 m-0 py-10 font-sans">
          <Container className="max-w-[560px] mx-auto bg-white rounded-xl p-10 border border-zinc-200">
            <Text className="m-0 mb-2 text-[22px] font-semibold text-zinc-900 leading-tight">
              You've been invited to {workspaceName}
            </Text>

            <Text className="m-0 mb-7 text-sm text-zinc-500 leading-relaxed">
              <strong className="text-zinc-700">{inviterName}</strong>{" "}
              <span className="text-zinc-400">({inviterEmail})</span> invited you to join{" "}
              <strong className="text-zinc-700">{workspaceName}</strong> as a{" "}
              <strong className="text-zinc-700">{role}</strong>.
            </Text>

            <Section className="mb-7">
              <Button
                href={acceptUrl}
                className="bg-zinc-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg no-underline"
              >
                Accept invitation
              </Button>
            </Section>

            <Text className="m-0 mb-7 text-xs text-zinc-400 leading-relaxed">
              Or copy this link into your browser:
              <br />
              <Link href={acceptUrl} className="text-zinc-500 break-all">
                {acceptUrl}
              </Link>
            </Text>

            <Hr className="my-7 border-none border-t border-zinc-200" />

            <Text className="m-0 text-xs text-zinc-400">
              If you weren't expecting this invitation you can ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
