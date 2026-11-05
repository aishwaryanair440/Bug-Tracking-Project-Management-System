export interface Student {
  id: string;
  name: string;
  email: string;
  year: number;
  phone: string;
  avatar?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'Pending' | 'Not Started' | 'Completed';
}

/**
 * Entity 7: BUG REPORT
 * Strictly: Bug_ID (PK), Task_ID (FK), Faculty_ID (FK), Student_ID (FK), Priority, Status, Title, Report_Date
 */
export interface BugReport {
  id: string; // Bug_ID (PK)
  taskId: string | number; // Task_ID (FK)
  taskName?: string;
  facultyId: string | number; // Faculty_ID (FK)
  facultyName?: string;
  studentId: string | number; // Student_ID (FK)
  studentName?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Fixed' | 'Under Review';
  title: string;
  reportDate: string;
}

export interface Project {
  id: string;
  facultyId?: number;
  facultyName?: string;
  title: string;
  description: string;
  teamId?: string;
  teamName: string;
  teamSize: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Planned';
  startDate: string;
  endDate: string;
  members: Student[];
  tasks: Task[];
}
