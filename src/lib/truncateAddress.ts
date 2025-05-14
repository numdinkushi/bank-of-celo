/* eslint-disable @typescript-eslint/no-explicit-any */
export const truncateAddress = (address: any) => {
  if (!address) return "";
  return `${address.slice(0, 14)}...${address.slice(-12)}`;
};
