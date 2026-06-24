import { RECEIPT_CONFIG } from "./receipt-config";

export type PhoneDirectoryEntry = {
  name: string;
  phone: string;
  note?: string;
};

/** Directorio telefónico de referencia para el cajero */
export const CAJERO_PHONE_DIRECTORY: PhoneDirectoryEntry[] = [
  { name: RECEIPT_CONFIG.businessName, phone: RECEIPT_CONFIG.phone, note: "Banca" },
  { name: "Lotería Nacional", phone: "809-687-1000" },
  { name: "Leidsa", phone: "809-732-6404" },
  { name: "Loteka", phone: "809-732-1111" },
  { name: "LoteDom", phone: "809-544-4040" },
  { name: "La Primera", phone: "809-620-1010" },
  { name: "La Suerte", phone: "809-620-2020" },
  { name: "Quiniela Real", phone: "809-544-3030" },
  { name: "Gana Más", phone: "809-544-5050" },
  { name: "Supervisión / Soporte", phone: RECEIPT_CONFIG.phone, note: "Supervisor" },
];
