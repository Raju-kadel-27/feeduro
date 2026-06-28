import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Link } from "@react-email/link";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";

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
    <Html>
      <Head />
      <Preview>
        {orgName} published a new update: {changelogTitle}
      </Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          margin: 0,
          paddingTop: "2.5rem",
          paddingBottom: "2.5rem",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            marginLeft: "auto",
            marginRight: "auto",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            padding: "2.5rem",
            border: "1px solid #e4e4e7",
          }}
        >
          <Text
            style={{
              margin: 0,
              marginBottom: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#a1a1aa",
              textTransform: "uppercase",
              letterSpacing: "0.025em",
            }}
          >
            {orgName} · New Update
          </Text>
          <Text
            style={{
              margin: 0,
              marginBottom: "1rem",
              fontSize: "22px",
              fontWeight: 600,
              color: "#18181b",
              lineHeight: 1.25,
            }}
          >
            {changelogTitle}
          </Text>

          {excerpt ? (
            <Text
              style={{
                margin: 0,
                marginBottom: "1.75rem",
                fontSize: "0.875rem",
                color: "#52525b",
                lineHeight: 1.625,
              }}
            >
              {excerpt}
            </Text>
          ) : null}

          <Section style={{ marginBottom: "1.75rem" }}>
            <Button
              href={changelogUrl}
              style={{
                backgroundColor: "#18181b",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 500,
                paddingLeft: "1.5rem",
                paddingRight: "1.5rem",
                paddingTop: "0.625rem",
                paddingBottom: "0.625rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Read the full update
            </Button>
          </Section>

          <Hr
            style={{
              marginTop: "1.75rem",
              marginBottom: "1.75rem",
              border: "none",
              borderTop: "1px solid #e4e4e7",
            }}
          />

          <Text style={{ margin: 0, fontSize: "0.75rem", color: "#a1a1aa" }}>
            You received this because you subscribed to changelog updates from{" "}
            <strong style={{ color: "#71717a" }}>{orgName}</strong>.{" "}
            <Link
              href={unsubscribeUrl}
              style={{ color: "#a1a1aa", textDecoration: "underline" }}
            >
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
