export const withBase = (value: string, baseUrl: string) =>
  value?.startsWith("http://") || value?.startsWith("https://")
    ? value
    : `${baseUrl.replace(/\/?$/, "/")}${value?.replace(/^\/+/, "")}`;
