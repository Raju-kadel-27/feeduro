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

interface ResetPasswordEmailProps {
  userName: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ userName, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Feeduro password</Preview>
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
              marginBottom: "0.5rem",
              fontSize: "22px",
              fontWeight: 600,
              color: "#18181b",
              lineHeight: 1.25,
            }}
          >
            Reset your password
          </Text>

          <Text
            style={{
              margin: 0,
              marginBottom: "1.75rem",
              fontSize: "0.875rem",
              color: "#71717a",
              lineHeight: 1.625,
            }}
          >
            Hi <strong style={{ color: "#3f3f46" }}>{userName}</strong>, we received a request to
            reset your Feeduro account password. Click the button below to choose a new one.
          </Text>

          <Section style={{ marginBottom: "1.75rem" }}>
            <Button
              href={resetUrl}
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
              Reset password
            </Button>
          </Section>

          <Text
            style={{
              margin: 0,
              marginBottom: "1.75rem",
              fontSize: "0.75rem",
              color: "#a1a1aa",
              lineHeight: 1.625,
            }}
          >
            Or copy this link into your browser:
            <br />
            <Link href={resetUrl} style={{ color: "#71717a", wordBreak: "break-all" }}>
              {resetUrl}
            </Link>
          </Text>

          <Hr
            style={{
              marginTop: "1.75rem",
              marginBottom: "1.75rem",
              border: "none",
              borderTop: "1px solid #e4e4e7",
            }}
          />

          <Text style={{ margin: 0, fontSize: "0.75rem", color: "#a1a1aa" }}>
            This link expires in 1 hour. If you didn't request a password reset, you can safely
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
