// Local storage based store - replace with Firebase later

export type GameType = "Free Fire Max" | "BGMI" | "Call of Duty";
export type RoleType =
  | "IGL"
  | "Primary Rusher"
  | "Secondary Rusher"
  | "Defender"
  | "Support"
  | "Sniper"
  | "Zone Pusher";

export interface UserProfile {
  id: string;
  username: string;
  realName: string;
  email: string;
  password: string;
  contactNumber: string;
  game: GameType;
  gameUid: string;
  gameName: string;
  level: number;
  role: RoleType;
  avatar?: string;
  verified: boolean;
  flagged: boolean;
  online: boolean;
  lastSeen: string;
  activityScore: number;
  instagram?: string;
  youtube?: string;
  deviceId: string;
  createdAt: string;
  lastLogin: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  game: GameType;
  leaderId: string;
  members: string[];
  maxMembers: number;
  description: string;
  createdAt: string;
}

export interface Invite {
  inviteId: string;
  teamId: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  seen: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: "chat" | "invite" | "invite_response" | "system";
  message: string;
  seen: boolean;
  createdAt: string;
  relatedId?: string;
}

const STORAGE_KEYS = {
  users: "gf_users",
  teams: "gf_teams",
  invites: "gf_invites",
  messages: "gf_messages",
  notifications: "gf_notifications",
  currentUser: "gf_currentUser",
  deviceId: "deviceId",
  reports: "gf_reports",
} as const;

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
const now = () => new Date().toISOString();

const getDeviceId = () => {
  let id = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!id) {
    id = generateId();
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
  }
  return id;
};

function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function isTeamFull(team: Team) {
  return team.members.length >= team.maxMembers;
}

// USERS
export function getUsers(): UserProfile[] {
  return getStore<UserProfile>(STORAGE_KEYS.users);
}

export function getUser(id: string): UserProfile | undefined {
  return getUsers().find((user) => user.id === id);
}

export function getUserByUsername(username: string): UserProfile | undefined {
  return getUsers().find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export function getUserByEmail(email: string): UserProfile | undefined {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserByGameUid(gameUid: string, game: GameType): UserProfile | undefined {
  return getUsers().find((user) => user.gameUid === gameUid && user.game === game);
}

export function getDeviceUsers(): UserProfile[] {
  return getUsers().filter((user) => user.deviceId === getDeviceId());
}

export function signUp(
  data: Omit<
    UserProfile,
    | "id"
    | "verified"
    | "flagged"
    | "online"
    | "lastSeen"
    | "activityScore"
    | "deviceId"
    | "createdAt"
    | "lastLogin"
  >,
): { success: boolean; error?: string; user?: UserProfile } {
  if (getUserByUsername(data.username)) return { success: false, error: "Username already taken" };
  if (getUserByEmail(data.email)) return { success: false, error: "Email already registered" };
  if (getUserByGameUid(data.gameUid, data.game)) return { success: false, error: "Game UID already registered for this game" };
  if (getDeviceUsers().length > 0) return { success: false, error: "Only one account per device allowed" };
  if (data.password.trim().length < 6) return { success: false, error: "Password must be at least 6 characters" };

  const createdAt = now();
  const user: UserProfile = {
    ...data,
    id: generateId(),
    verified: false,
    flagged: false,
    online: true,
    lastSeen: createdAt,
    activityScore: 50,
    deviceId: getDeviceId(),
    createdAt,
    lastLogin: createdAt,
  };

  const users = getUsers();
  users.push(user);
  setStore(STORAGE_KEYS.users, users);
  setCurrentUser(user.id);
  addNotification(user.id, "system", "Welcome to Squad Finder. Start by exploring players or creating a team.");
  return { success: true, user };
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: UserProfile } {
  const user = getUserByEmail(email);
  if (!user) return { success: false, error: "User not found" };
  if (user.password !== password) return { success: false, error: "Incorrect password" };

  const users = getUsers().map((existingUser) =>
    existingUser.id === user.id
      ? { ...existingUser, online: true, lastLogin: now(), lastSeen: now() }
      : existingUser,
  );
  setStore(STORAGE_KEYS.users, users);
  setCurrentUser(user.id);
  return { success: true, user: users.find((existingUser) => existingUser.id === user.id) };
}

export function logout() {
  const uid = getCurrentUserId();
  if (uid) {
    const users = getUsers().map((user) => (user.id === uid ? { ...user, online: false, lastSeen: now() } : user));
    setStore(STORAGE_KEYS.users, users);
  }
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

export function updateProfile(id: string, data: Partial<UserProfile>) {
  const users = getUsers().map((user) => (user.id === id ? { ...user, ...data } : user));
  setStore(STORAGE_KEYS.users, users);
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.currentUser);
}

export function setCurrentUser(id: string) {
  localStorage.setItem(STORAGE_KEYS.currentUser, id);
}

export function getCurrentUser(): UserProfile | undefined {
  const id = getCurrentUserId();
  return id ? getUser(id) : undefined;
}

// TEAMS
export function getTeams(): Team[] {
  return getStore<Team>(STORAGE_KEYS.teams);
}

export function getTeam(id: string): Team | undefined {
  return getTeams().find((team) => team.teamId === id);
}

export function createTeam(data: Omit<Team, "teamId" | "createdAt">): Team {
  const team: Team = {
    ...data,
    maxMembers: Math.max(2, Math.min(6, data.maxMembers)),
    teamId: generateId(),
    createdAt: now(),
  };
  const teams = getTeams();
  teams.push(team);
  setStore(STORAGE_KEYS.teams, teams);
  return team;
}

export function joinTeam(teamId: string, userId: string): { success: boolean; error?: string } {
  const team = getTeam(teamId);
  if (!team) return { success: false, error: "Team not found" };
  if (team.members.includes(userId)) return { success: false, error: "You are already in this team" };
  if (isTeamFull(team)) return { success: false, error: "Team is already full" };

  const teams = getTeams().map((existingTeam) =>
    existingTeam.teamId === teamId ? { ...existingTeam, members: [...existingTeam.members, userId] } : existingTeam,
  );
  setStore(STORAGE_KEYS.teams, teams);
  return { success: true };
}

export function leaveTeam(teamId: string, userId: string) {
  const team = getTeam(teamId);
  if (!team) return;

  const remainingMembers = team.members.filter((memberId) => memberId !== userId);
  if (remainingMembers.length === 0) {
    deleteTeam(teamId);
    return;
  }

  const nextLeaderId = team.leaderId === userId ? remainingMembers[0] : team.leaderId;
  const teams = getTeams().map((existingTeam) =>
    existingTeam.teamId === teamId
      ? { ...existingTeam, leaderId: nextLeaderId, members: remainingMembers }
      : existingTeam,
  );
  setStore(STORAGE_KEYS.teams, teams);
}

export function deleteTeam(teamId: string) {
  setStore(
    STORAGE_KEYS.teams,
    getTeams().filter((team) => team.teamId !== teamId),
  );
  setStore(
    STORAGE_KEYS.invites,
    getInvites().filter((invite) => invite.teamId !== teamId),
  );
}

export function getUserTeams(userId: string): Team[] {
  return getTeams().filter((team) => team.members.includes(userId));
}

export function getOpenTeams(excludeUserId?: string): Team[] {
  return getTeams().filter((team) => !isTeamFull(team) && (!excludeUserId || !team.members.includes(excludeUserId)));
}

// INVITES
export function getInvites(): Invite[] {
  return getStore<Invite>(STORAGE_KEYS.invites);
}

export function getPendingInvite(teamId: string, receiverId: string): Invite | undefined {
  return getInvites().find(
    (invite) => invite.teamId === teamId && invite.receiverId === receiverId && invite.status === "pending",
  );
}

export function getUserInvites(userId: string): Invite[] {
  return getInvites().filter((invite) => invite.receiverId === userId && invite.status === "pending");
}

export function getPendingInvitesForLeader(leaderId: string): Invite[] {
  const leaderTeamIds = getTeams()
    .filter((team) => team.leaderId === leaderId)
    .map((team) => team.teamId);

  return getInvites().filter((invite) => leaderTeamIds.includes(invite.teamId) && invite.status === "pending");
}

export function sendInvite(teamId: string, senderId: string, receiverId: string): { success: boolean; error?: string } {
  if (senderId === receiverId) return { success: false, error: "You cannot invite yourself" };

  const team = getTeam(teamId);
  if (!team) return { success: false, error: "Team not found" };
  if (team.leaderId !== senderId) return { success: false, error: "Only the team leader can send invites" };
  if (team.members.includes(receiverId)) return { success: false, error: "Player is already in this team" };
  if (isTeamFull(team)) return { success: false, error: "Team is already full" };
  if (getPendingInvite(teamId, receiverId)) return { success: false, error: "Invite already pending for this player" };

  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const recentInvites = getInvites().filter((invite) => invite.senderId === senderId && invite.createdAt > hourAgo);
  if (recentInvites.length >= 5) return { success: false, error: "Max 5 invites per hour" };

  const invite: Invite = {
    inviteId: generateId(),
    teamId,
    senderId,
    receiverId,
    status: "pending",
    createdAt: now(),
  };

  const invites = getInvites();
  invites.push(invite);
  setStore(STORAGE_KEYS.invites, invites);
  addNotification(receiverId, "invite", `${team.teamName} invited you to join the squad.`, teamId);
  return { success: true };
}

export function respondInvite(inviteId: string, status: "accepted" | "rejected") {
  const invite = getInvites().find((existingInvite) => existingInvite.inviteId === inviteId);
  if (!invite) return;

  const invites = getInvites().map((existingInvite) =>
    existingInvite.inviteId === inviteId ? { ...existingInvite, status } : existingInvite,
  );
  setStore(STORAGE_KEYS.invites, invites);

  if (status === "accepted") {
    joinTeam(invite.teamId, invite.receiverId);
  }

  const team = getTeam(invite.teamId);
  addNotification(
    invite.senderId,
    "invite_response",
    `${getUser(invite.receiverId)?.username || "A player"} ${status} your invite${team ? ` for ${team.teamName}` : ""}.`,
    invite.teamId,
  );
}

// CHAT
export function getMessages(): ChatMessage[] {
  return getStore<ChatMessage>(STORAGE_KEYS.messages);
}

export function getConversation(userId1: string, userId2: string): ChatMessage[] {
  return getMessages()
    .filter(
      (message) =>
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1),
    )
    .sort((firstMessage, secondMessage) => new Date(firstMessage.timestamp).getTime() - new Date(secondMessage.timestamp).getTime());
}

export function getChatPartners(userId: string): string[] {
  const messages = getMessages().filter((message) => message.senderId === userId || message.receiverId === userId);
  const partners = new Set(messages.map((message) => (message.senderId === userId ? message.receiverId : message.senderId)));
  return Array.from(partners);
}

export function sendMessage(senderId: string, receiverId: string, text: string): ChatMessage {
  const message: ChatMessage = {
    id: generateId(),
    senderId,
    receiverId,
    text,
    timestamp: now(),
    seen: false,
  };
  const messages = getMessages();
  messages.push(message);
  setStore(STORAGE_KEYS.messages, messages);
  addNotification(receiverId, "chat", `New message from ${getUser(senderId)?.username || "someone"}`, senderId);
  return message;
}

export function markSeen(senderId: string, receiverId: string) {
  const messages = getMessages().map((message) =>
    message.senderId === senderId && message.receiverId === receiverId ? { ...message, seen: true } : message,
  );
  setStore(STORAGE_KEYS.messages, messages);
}

// NOTIFICATIONS
export function getNotifications(): Notification[] {
  return getStore<Notification>(STORAGE_KEYS.notifications);
}

export function getUserNotifications(userId: string): Notification[] {
  return getNotifications()
    .filter((notification) => notification.userId === userId)
    .sort((firstNotification, secondNotification) => new Date(secondNotification.createdAt).getTime() - new Date(firstNotification.createdAt).getTime());
}

export function getUnreadCount(userId: string): number {
  return getUserNotifications(userId).filter((notification) => !notification.seen).length;
}

export function addNotification(userId: string, type: Notification["type"], message: string, relatedId?: string) {
  const notification: Notification = {
    id: generateId(),
    userId,
    type,
    message,
    seen: false,
    createdAt: now(),
    relatedId,
  };
  const notifications = getNotifications();
  notifications.push(notification);
  setStore(STORAGE_KEYS.notifications, notifications);
}

export function markNotificationsRead(userId: string) {
  const notifications = getNotifications().map((notification) =>
    notification.userId === userId ? { ...notification, seen: true } : notification,
  );
  setStore(STORAGE_KEYS.notifications, notifications);
}

export function clearNotifications(userId: string) {
  setStore(
    STORAGE_KEYS.notifications,
    getNotifications().filter((notification) => notification.userId !== userId),
  );
}

// BLOCK/REPORT
export function getBlockedUsers(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`gf_blocked_${userId}`) || "[]");
  } catch {
    return [];
  }
}

export function blockUser(userId: string, targetId: string) {
  const blockedUsers = getBlockedUsers(userId);
  if (!blockedUsers.includes(targetId)) {
    blockedUsers.push(targetId);
    localStorage.setItem(`gf_blocked_${userId}`, JSON.stringify(blockedUsers));
  }
}

export function reportUser(reporterId: string, targetId: string, reason: string) {
  const reports = getStore<{ id: string; reporterId: string; targetId: string; reason: string; createdAt: string }>(
    STORAGE_KEYS.reports,
  );
  reports.push({ id: generateId(), reporterId, targetId, reason, createdAt: now() });
  setStore(STORAGE_KEYS.reports, reports);

  const targetReports = reports.filter((report) => report.targetId === targetId);
  if (targetReports.length >= 3) updateProfile(targetId, { flagged: true });
}
