export enum ActivityStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum ActiveActivitiesAction {
  MOVE = "MOVE",
  ARCHIVE = "ARCHIVE",
}

export enum ActCategoryStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum CompanyStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum CompanyCurrency {
  USD = "USD",
  EUR = "EUR",
  UAH = "UAH",
  GBP = "GBP",
}

export enum WeekDay {
  MONDAY = "MONDAY",
  SUNDAY = "SUNDAY",
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  COMPLETED = "COMPLETED",
}

export enum TeamStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum TeamRole {
  MEMBER = "MEMBER",
  MANAGER = "MANAGER",
}

export enum UserRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DEACTIVATED = "DEACTIVATED",
}

export enum AbsenceType {
  VACATION = "VACATION",
  SICK_LEAVE = "SICK_LEAVE",
  PUBLIC_HOLIDAY = "PUBLIC_HOLIDAY",
}

export enum ReportingMonthState {
  OPEN = "OPEN",
  GRACE = "GRACE",
  LOCKED = "LOCKED",
  REOPENED = "REOPENED",
}

export enum HoursReportGroupBy {
  CLIENT = "client",
  PROJECT = "project",
  ACTIVITY = "activity",
  PERSON = "person",
}

/** Mirrors the backend's UnusableInvitationCode. */
export enum UnusableInvitationCode {
  NOT_FOUND = "INVITATION_NOT_FOUND",
  EXPIRED = "INVITATION_EXPIRED",
  REVOKED = "INVITATION_REVOKED",
  ACCEPTED = "INVITATION_ACCEPTED",
  ACCOUNT_EXISTS = "INVITATION_ACCOUNT_EXISTS",
}

/** Mirrors the backend's NotificationType. */
export enum NotificationType {
  INVITATION_ACCEPTED = "INVITATION_ACCEPTED",
}

export enum ArchivedActivitiesAction {
  RESTORE = "RESTORE",
}
