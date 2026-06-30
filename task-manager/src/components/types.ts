export interface TaskDTO {
  id: string;
  rawInput: string;
  title: string;
  notes: string | null;
  priority: number;
  dueDate: string | null;
  status: string;
  source: string;
  needsCalendar: boolean;
  calendarSent: boolean;
  calendarEventTime: string | null;
  enriched: boolean;
  reminderState: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type Filter = 'all' | 'today' | 'week' | 'overdue' | 'priority';

export const PRIORITY_LABEL = ['', 'Low', 'Medium', 'High'];
