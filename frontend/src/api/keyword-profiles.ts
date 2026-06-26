import api from "./client";
import type { KeywordProfile } from "../types";

export async function listProfiles(): Promise<KeywordProfile[]> {
  const { data } = await api.get<KeywordProfile[]>("/keyword-profiles");
  return data;
}

export async function createProfile(
  nombre: string,
  keywords: string[],
): Promise<KeywordProfile> {
  const { data } = await api.post<KeywordProfile>("/keyword-profiles", {
    nombre,
    keywords,
  });
  return data;
}

export async function updateProfile(
  id: number,
  nombre: string,
  keywords: string[],
): Promise<KeywordProfile> {
  const { data } = await api.put<KeywordProfile>(`/keyword-profiles/${id}`, { nombre, keywords });
  return data;
}

export async function deleteProfile(id: number): Promise<void> {
  await api.delete(`/keyword-profiles/${id}`);
}
