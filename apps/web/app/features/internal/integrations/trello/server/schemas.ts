export type TrelloStatusMapping = {
  listId: string;
  listName: string;
  feeduroStatus: string;
};

export type TrelloSettings = {
  memberId?: string;
  memberUsername?: string;
  defaultBoardId?: string;
  defaultBoardName?: string;
  defaultListId?: string;
  defaultListName?: string;
  autoCreateCards: boolean;
  webhookId?: string;
  statusMappings?: TrelloStatusMapping[];
};
