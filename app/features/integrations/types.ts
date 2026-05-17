import type React from "react";

export interface OAuthIntegration {
  configured: boolean;
  connected: boolean;
}

export interface GitHubIntegration extends OAuthIntegration {
  repo: string | null;
}

export interface LinearIntegration extends OAuthIntegration {
  workspaceName: string | null;
}

export interface JiraIntegration extends OAuthIntegration {
  cloudName: string | null;
}

export interface AsanaIntegration extends OAuthIntegration {
  workspaceName: string | null;
}

export interface NotionIntegration extends OAuthIntegration {
  workspaceName: string | null;
}

export interface MondayIntegration extends OAuthIntegration {
  accountName: string | null;
}

export interface TrelloIntegration extends OAuthIntegration {
  memberUsername: string | null;
}

export interface ShortcutIntegration {
  connected: boolean;
  memberName: string | null;
  mentionName: string | null;
}

export interface ZapierIntegration {
  connected: boolean;
  webhookUrl: string | null;
}

export interface N8nIntegration {
  connected: boolean;
  webhookUrl: string | null;
}

export interface ZendeskIntegration extends OAuthIntegration {
  subdomain: string | null;
  accountName: string | null;
}

export interface HubSpotIntegration extends OAuthIntegration {
  portalId: string | null;
  hubDomain: string | null;
}

export interface SalesforceIntegration extends OAuthIntegration {
  instanceUrl: string | null;
  displayName: string | null;
}

export interface SocialIntegration {
  enabled: boolean;
}

export interface IntegrationCardData {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  configured: boolean;
  buttonLabel?: string;
  onClick?: () => void;
}

export interface SocialLoginCardData {
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  docsUrl?: string;
  setupSteps?: string[];
}