// Le CRM analyse déjà la boîte Outlook : ces fonctions du générateur d'origine sont désactivées.
export type ScanRecord = Record<string, unknown>;
const off = async (..._a: unknown[]): Promise<never> => { throw new Error("Analyse Outlook gérée par le CRM"); };
export const listAllMailFolders = off;
export const listFolderMessages = off;
export const scanMessage = off;
export const extractRecordsFromText = off;
export const runMailIngest = off;
export const listAllowedUsers = off;
export const addAllowedUser = off;
export const deleteAllowedUser = off;
export type AllowedUser = { id: string; first_name: string; last_name: string; email: string };
