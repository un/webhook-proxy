export function isBodyJson(contentType: string) {
  const splitType = contentType.split(";")[0];
  return splitType === "application/json";
}
