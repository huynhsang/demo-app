export type Status = 'open' | 'in_progress' | 'closed';
export type Priority = 'low' | 'medium' | 'high';

export interface Comment {
  id: number;
  issue_id: number;
  author: string;
  body: string;
  created_at: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee: string;
  created_at: string;
  updated_at: string;
}

export interface IssueDetail extends Issue {
  comments: Comment[];
}
