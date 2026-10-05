/** Someone quotations are sent to. */
export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string;
  rfc: string | null;
  createdAt: string;
  updatedAt: string;
}
