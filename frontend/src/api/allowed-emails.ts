import api from "./client";

export interface AllowedEmail {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string | null;
}

interface ListResponse {
  emails: AllowedEmail[];
  admin_emails: string[];
}

export async function listAllowedEmails(): Promise<ListResponse> {
  const { data } = await api.get<ListResponse>("/allowed-emails");
  return data;
}

export async function addAllowedEmail(email: string): Promise<AllowedEmail> {
  const { data } = await api.post<AllowedEmail>("/allowed-emails", { email });
  return data;
}

export async function removeAllowedEmail(id: number): Promise<void> {
  await api.delete(`/allowed-emails/${id}`);
}
