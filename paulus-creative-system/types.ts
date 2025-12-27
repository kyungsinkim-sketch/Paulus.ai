
import { Deck, DeckVersion, CommentDoc, BilingualContent, SyncStatus, Language } from './deck-editor';

export enum Role {
  CREATIVE_DIRECTOR = 'Creative Director',
  STRATEGIST = 'Strategist',
  COPYWRITER = 'Copywriter',
  ART_DIRECTOR = 'Art Director',
  PRODUCER = 'Producer',
  ADMIN = 'Admin',
  VIEWER = 'Viewer'
}

/**
 * CANONICAL PROJECT ROLES (Spec v2)
 */
export enum ProjectRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export type PermissionLevel = 'ADMIN' | 'CORE_OPERATIONS' | 'LIMITED_ACCESS' | 'CUSTOM';

export type UserWorkStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'LUNCH' | 'WORKOUT';
export type EmployeeGroup = 'DIRECTOR' | 'LEADER' | 'SENIOR' | 'JUNIOR' | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface User {
  id: string;
  employeeId?: string;
  name: string;
  koreanName?: string;
  email: string;
  role: string;
  team?: string;
  group?: EmployeeGroup;
  permissionLevel: PermissionLevel;

  avatar: string;
  employmentStatus?: EmploymentStatus;
  joinDate?: string;
  /* Personal Info */
  phoneNumber?: string;
  address?: string;
  personalEmail?: string;
  university?: string;
  major?: string;
  educationHistory?: { school: string; major: string; year?: string }[];

  /* HR & Finance */
  department?: string; // e.g. Management, Production, Creative Solution
  position?: string; // e.g. CEO, Leader, Senior, Junior
  jobTitle?: string; // e.g. TL, PRO, SEMI-PRO
  level?: string; // e.g. D1, L1, S1, P1
  salaryClass?: string; // e.g. D+, A, C

  annualSalary?: number;
  monthlySalary?: number;

  workStatus: UserWorkStatus;
  lastStatusChange: string;
  lastLocation?: { lat: number; lng: number; timestamp: string };
}

/**
 * PROJECT MEMBERSHIP
 * Single source of truth for RLS-based project access.
 */
export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

/**
 * PROJECT PRESENCE
 * Realtime tracking for team availability within a project.
 */
export interface ProjectPresence {
  userId: string;
  status: UserWorkStatus;
  lastChangedAt: string;
  lastLocation?: { lat: number; lng: number };
}

export type BriefSource = 'USER_EDITED' | 'AI_EXTRACTED';

export interface BriefProblemDefinition {
  statement: string;
  why: string;
  cause: string;
  isConfirmed: boolean;
  translations?: {
    statement: { EN: string; KO: string };
    why: { EN: string; KO: string };
    cause: { EN: string; KO: string };
  };
}

export interface Brief {
  rawText: string;
  overview?: string;
  objectives?: string;
  targetAudience?: string;
  keyMessage?: string;
  competitors?: string;
  brandTone?: string;
  deliverablesChannels?: string;
  timelineBudget?: string;
  problemDefinition: BriefProblemDefinition;
  gaps: string[];
  assumptions: string[];
  sources?: Record<string, BriefSource>;
  translations?: Record<string, { EN: string, KO: string }>;
}

export type StrategySectionType = 'BACKGROUND' | 'PROBLEM' | 'AUDIENCE' | 'STRATEGY' | 'INSIGHTS' | 'KEY_MESSAGE';

export interface StrategySection {
  id: string;
  type: StrategySectionType;
  title: string;
  content: string;
  linkedSlideId?: string;
}

export type DirectionCategory = 'CAST' | 'COSTUME' | 'PROPS' | 'LOCATION';

export interface DirectionItem {
  id: string;
  category: DirectionCategory;
  name: string;
  description?: string;
  imageUrl?: string;
  linkedFrameIds: string[];
  status: 'DRAFT' | 'CONFIRMED';
  authorId: string;
}

/**
 * PRODUCTION CHAT SCHEMA
 * Matches project_chat_messages database table.
 */
export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: string; // Maps to created_at in Postgres
  type: 'TEXT' | 'FILE' | 'AI_GENERATED';
  role?: string;
}

export interface CanvasItemStyle {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number | 'SMALL' | 'MEDIUM' | 'LARGE';
}

export type NodeStatus = 'IDEA' | 'CANDIDATE' | 'SELECTED' | 'ARCHIVED';

export interface CanvasItem {
  id: string;
  type: 'STICKY' | 'IMAGE' | 'SHAPE' | 'PROBLEM' | 'STRATEGY' | 'IDEA';
  status: NodeStatus;
  syncStatus?: 'SYNCED' | 'OUT_OF_SYNC';
  x: number;
  y: number;
  width: number;
  height: number;
  heightMode?: 'auto' | 'manual';
  content?: string;
  color?: string;
  authorId: string;
  style?: CanvasItemStyle;
  textStyle?: any;
  sourceReference?: { type: string; id: string };
  linkedSlideId?: string;
  assetType?: string;
  bilingualContent?: BilingualContent;
}

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface MindMapNode extends CanvasItem {
  label: string;
  notes?: string;
  children?: string[];
}

export interface ScheduleRow {
  id: string;
  type: 'SHOOT' | 'BREAK' | 'MOVE';
  timeStart: string;
  timeEnd: string;
  duration: string;
  sceneNum: string;
  cutNum: string;
  dayNight: 'D' | 'N' | '';
  location: string;
  description: string;
  cast: string;
  performers: string;
  notes: string;
  linkedFrameIds?: string[];
}

export interface ScheduleDay {
  id: string;
  dayNumber: number;
  date: string;
  callTime: string;
  location: string;
  locationAddress: string;
  producer: string;
  director: string;
  ad: string;
  rows: ScheduleRow[];
}

export type AttendanceEventType = 'LOGIN' | 'LOGOUT' | 'LUNCH_START' | 'LUNCH_END' | 'EXERCISE_START' | 'EXERCISE_END';

export interface AttendanceEvent {
  id: string;
  userId: string;
  type: AttendanceEventType;
  timestamp: string;
}

export interface DailyAttendanceStats {
  date: string;
  userId: string;
  firstLogin: string | null;
  lastLogout: string | null;
  netWorkMinutes: number;
  breakMinutes: number;
  isLate: boolean;
  isInsufficient: boolean;
  status: 'PRESENT' | 'ABSENT';
}

export interface MonthlyAttendanceSummary {
  userId: string;
  userName: string;
  totalWorkMinutes: number;
  lateCount: number;
  insufficientCount: number;
  riskLevel: 'NONE' | 'LOW' | 'HIGH';
  weekly52hRisk: boolean;
  productivityScore: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  dueDate: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  phase: string;
  sourceReference?: { type: string; id: string };
}

export interface Request {
  id: string;
  requesterId: string;
  assigneeId: string;
  message: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  context: string;
  timestamp: string;
  completionComment?: string;
}

export type IntegrationSystem = 'GOOGLE_SLIDES' | 'PPTX_LOCAL';

export interface IntegrationAuditEntry {
  id: string;
  timestamp: string;
  system: IntegrationSystem;
  action: 'EXPORT_NEW' | 'UPDATE_EXISTING' | 'IMPORT';
  userId: string;
  userName: string;
  versionId?: string;
  versionName?: string;
  externalId?: string;
  details?: string;
}

export type EstimateType = 'TYPE_A' | 'TYPE_B' | 'TYPE_C' | 'TYPE_D';

export interface EstimateItemB {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  unit: string;
}

export interface EstimateCategoryB {
  id: string;
  code: string;
  name: string;
  items: EstimateItemB[];
}

export interface EstimateDataB {
  meta: {
    advertiser: string;
    productName: string;
    date: string;
    director: string;
    schedule: any;
    crewCounts: any;
  };
  categories: EstimateCategoryB[];
  markupRate: number;
}

export interface EstimateItemC {
  id: string;
  category: string;
  itemName: string;
  detail: string;
  unitCost: number;
  quantity: number;
  unit: string;
}

export interface EstimateSubProjectC {
  id: string;
  name: string;
  type: string;
  items: EstimateItemC[];
}

export interface EstimateDataC {
  subProjects: EstimateSubProjectC[];
  generalAdminFeeRate: number;
  vatRate: number;
}

export interface EstimateItemD_Fixed {
  id: string;
  task: string;
  description: string;
  grade: string;
  mm: number;
  unitPrice: number;
  totalAmount: number;
}

export interface EstimateItemD_Variable {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
}

export interface EstimateDataD {
  meta: {
    clientName: string;
    projectName: string;
    period: string;
    contactPerson: string;
  };
  fixedCosts: EstimateItemD_Fixed[];
  variableCosts: EstimateItemD_Variable[];
}

export interface EstimateRow {
  id: string;
  description: string;
  amount: number;
}

export interface EstimateScenario {
  id: string;
  name: string;
  total: number;
}

export interface ProductionData {
  activeEstimateType: EstimateType;
  estimateB?: EstimateDataB;
  estimateC?: EstimateDataC;
  estimateD?: EstimateDataD;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  startDate: string;
  endDate: string;
  strategyEndDate: string;
  directionStartDate: string;
  phase: 'STRATEGY' | 'DIRECTION';
  status: 'ACTIVE' | 'COMPLETED';
  members: User[];
  projectMembers?: ProjectMember[]; // R15: Canonical membership
  brief: Brief;
  strategyResearch: StrategySection[];
  canvasItems: CanvasItem[];
  canvasConnections: CanvasConnection[];
  deck: any;
  directionBoard: DirectionItem[];
  shootingSchedule: ScheduleDay[];
  productionData?: ProductionData;
  tasks: Task[];
  chatHistory: ChatMessage[];
  requests: Request[];
  thumbnailUrl?: string;
  versions: DeckVersion[];
  comments: CommentDoc[];
  deliveryAuditLog: IntegrationAuditEntry[];
}

export * from './deck-editor';
