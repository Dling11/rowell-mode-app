export type PublicUpdate = {
  id: string;
  title: string;
  body: string;
  projectId: string;
  status: string;
  publishedAt: string;
};
export type UpdateRecord = {
  id: string;
  title: string;
  body: string;
  projectId: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};
