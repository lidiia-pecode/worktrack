export interface Timelog {
  id: string;
  user_id: string;
  task_id: string;
  time: number;
  note?: string;
  date: string;
  updated_at: Date;
  created_at: Date;
}
