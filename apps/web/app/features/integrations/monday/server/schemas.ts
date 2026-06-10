export type MondayStatusMapping = {
  groupId: string;
  groupTitle: string;
  feeduroStatus: string;
};

export type MondaySettings = {
  accountId?: string;
  accountName?: string;
  defaultBoardId?: string;
  defaultBoardName?: string;
  defaultGroupId?: string;
  autoCreateItems: boolean;
  webhookIds?: string[];
  webhookSecret?: string;
  statusMappings?: MondayStatusMapping[];
};
