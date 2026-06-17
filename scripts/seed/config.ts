export interface SeedConfig {
  userDb: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  minio: {
    endpoint: string;
    publicEndpoint: string;
    accessKey: string;
    secretKey: string;
    userPortraitsBucket: string;
  };
}

export function getSeedConfig(env: NodeJS.ProcessEnv): SeedConfig {
  return {
    userDb: {
      host: env.USER_DB_HOST ?? "localhost",
      port: parsePort(env.USER_DB_PORT ?? "5432", "USER_DB_PORT"),
      database: env.USER_DB_NAME ?? "verita_users",
      user: env.USER_DB_USER ?? "verita_user",
      password: env.USER_DB_PASSWORD ?? "verita_password",
    },
    minio: {
      endpoint: env.MINIO_ENDPOINT ?? "http://localhost:9000",
      publicEndpoint: stripTrailingSlash(env.MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000"),
      accessKey: env.MINIO_ACCESS_KEY ?? "verita_minio",
      secretKey: env.MINIO_SECRET_KEY ?? "verita_minio_password",
      userPortraitsBucket: env.USER_PORTRAITS_BUCKET ?? "verita-user-portraits",
    },
  };
}

function parsePort(value: string, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port, got "${value}".`);
  }
  return port;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
