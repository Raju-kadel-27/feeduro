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

interface ChangelogNotificationEmailProps {
  orgName: string;
  changelogTitle: string;
  excerpt: string;
  changelogUrl: string;
  unsubscribeUrl: string;
}

export function ChangelogNotificationEmail({
  orgName,
  changelogTitle,
  excerpt,
  changelogUrl,
  unsubscribeUrl,
}: ChangelogNotificationEmailProps) {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          {orgName} published a new update: {changelogTitle}
        </Preview>
        <Body className="bg-zinc-100 m-0 py-10 font-sans">
          <Container className="max-w-[560px] mx-auto bg-white rounded-xl p-10 border border-zinc-200">
            <Text className="m-0 mb-1 text-xs font-medium text-zinc-400 uppercase tracking-wide">
              {orgName} · New Update
            </Text>
            <Text className="m-0 mb-4 text-[22px] font-semibold text-zinc-900 leading-tight">
              {changelogTitle}
            </Text>

            {excerpt ? (
              <Text className="m-0 mb-7 text-sm text-zinc-600 leading-relaxed">{excerpt}</Text>
            ) : null}

            <Section className="mb-7">
              <Button
                href={changelogUrl}
                className="bg-zinc-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg no-underline"
              >
                Read the full update
              </Button>
            </Section>

            <Hr className="my-7 border-none border-t border-zinc-200" />

            <Text className="m-0 text-xs text-zinc-400">
              You received this because you subscribed to changelog updates from{" "}
              <strong className="text-zinc-500">{orgName}</strong>.{" "}
              <Link href={unsubscribeUrl} className="text-zinc-400 underline">
                Unsubscribe
              </Link>
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
