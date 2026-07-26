export type Env = {
  Bindings: {
    HYPERDRIVE: Hyperdrive;
    DATABASE_URL?: string;
  };
  Variables: {
    organizationId: string;
  };
};
