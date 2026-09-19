export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface ExamTrendPoint {
  examId: string;
  examName: string;
  date: string;
  averagePercentage: number;
  studentCount: number;
}

export interface ClassAveragePoint {
  className: string;
  averagePercentage: number;
  studentCount: number;
}

export interface StudentPerformanceReport {
  examTrend: ExamTrendPoint[];
  latestExamName: string | null;
  classAverages: ClassAveragePoint[];
  overallAverage: number;
}

export interface AttendanceTrendPoint {
  month: string;
  studentPercent: number | null;
  staffPercent: number | null;
}

export interface AttendanceTrendReport {
  trend: AttendanceTrendPoint[];
  studentAverage: number;
  staffAverage: number;
}

export interface FeeMonthPoint {
  month: string;
  collected: number;
  pending: number;
}

export interface FeeCollectionReport {
  monthly: FeeMonthPoint[];
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
}

export interface TeacherPerformancePoint {
  staffId: string;
  teacherName: string;
  averageScore: number;
  classCount: number;
}

export interface AdmissionsReport {
  statusBreakdown: Array<{ status: string; count: number }>;
  monthlyApplications: MonthlyPoint[];
  totalApplications: number;
  approvalRate: number;
}

export interface DropoutReport {
  statusBreakdown: Array<{ status: string; count: number }>;
  inactiveByClass: Array<{ className: string; count: number }>;
  totalStudents: number;
  dropoutRate: number;
}

export interface LibraryUsageReport {
  monthlyLoans: MonthlyPoint[];
  topCategories: Array<{ category: string; count: number }>;
  totalLoans: number;
  currentlyIssued: number;
  overdueCount: number;
}

export interface TransportUtilizationPoint {
  routeName: string;
  assigned: number;
  capacity: number;
  utilizationPercent: number;
}

export interface TransportUtilizationReport {
  routes: TransportUtilizationPoint[];
  totalAssigned: number;
  totalCapacity: number;
  overallUtilization: number;
}

export interface HostelOccupancyPoint {
  hostelName: string;
  occupied: number;
  vacant: number;
  bedCount: number;
}

export interface HostelOccupancyReport {
  hostels: HostelOccupancyPoint[];
  totalOccupied: number;
  totalBeds: number;
  overallOccupancy: number;
}
