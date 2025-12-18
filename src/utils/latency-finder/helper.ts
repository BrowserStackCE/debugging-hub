// Helper: convert UTC timestamp to epoch ms
export const convertUTCToEpoch = (time: string): number => {
  return Date.parse(time);
};

export const nullCheck = (value: number | null | undefined): number => {
  return value === null || typeof value === "undefined" ? -1 : value;
};