/** Who issues the quotations: the header of every document. */
export interface IssuerProfile {
  name: string;
  role: string;
  email: string;
  phone: string;
  razonSocial: string;
  rfc: string;
  location: string;
  logoUrl: string | null;
  updatedAt: string;
}
