import type {
  AuthResult,
  ChatMessage,
  GameType,
  Invite,
  Notification,
  ProfileUpdateData,
  SignUpData,
  StoreResult,
  Team,
  UserProfile,
} from "./store-types";

type StoreListener = () => void;

const STORAGE_KEYS = {
  users: "gf_users",
  teams: "gf_teams",
  invites: "gf_invites",
  messages: "gf_messages",
  notifications: "gf_notifications",
  currentUser: "gf_currentUser",
  passwords: "gf_passwords",
  reports: "gf_reports",
} as const;

const listeners = new Set<StoreListener>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export function subscribeStore(listener: StoreListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
const now = () => new Date().toISOString();

function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  emitChange();
}

function isTeamFull(team: Team) {
  return team.members.length >= team.maxMembers;
}

function addNotification(userId: string, type: Notification["type"], message: string, relatedId?: string) {
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

function getUserByUsername(username: string): UserProfile | undefined {
  return getUsers().find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function getUserByEmail(email: string): UserProfile | undefined {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function getUserByGameUid(gameUid: string, game: GameType): UserProfile | undefined {
  return getUsers().find((user) => user.gameUid === gameUid && user.game === game);
}

export async function initializeStoreSession(userId: string) {
  setCurrentUser(userId);
}

export function clearStoreSession() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  emitChange();
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  return getUser(userId) || null;
}

export function getUsers(): UserProfile[] {
  return getStore<UserProfile>(STORAGE_KEYS.users);
}

export function getUser(id: string): UserProfile | undefined {
  return getUsers().find((user) => user.id === id);
}

export async function signUp(data: SignUpData): Promise<AuthResult> {
  if (getUserByUsername(data.username)) return { success: false, error: "Username already taken" };
  if (getUserByEmail(data.email)) return { success: false, error: "Email already registered" };
  if (getUserByGameUid(data.gameUid, data.game)) return { success: false, error: "Game UID already registered for this game" };
  if (data.password.trim().length < 6) return { success: false, error: "Password must be at least 6 characters" };

  const createdAt = now();
  const user: UserProfile = {
    id: generateId(),
    username: data.username,
    realName: data.realName,
    email: data.email,
    contactNumber: data.contactNumber,
    game: data.game,
    gameUid: data.gameUid,
    gameName: data.gameName,
    level: data.level,
    role: data.role,
    avatar: data.avatar,
    verified: false,
    flagged: false,
    online: true,
    lastSeen: createdAt,
    activityScore: 50,
    createdAt,
    lastLogin: createdAt,
  };

  const users = getUsers();
  const passwordStore = getStore<{ userId: string; password: string }>(STORAGE_KEYS.passwords);
  users.push(user);
  passwordStore.push({ userId: user.id, password: data.password });

  setStore(STORAGE_KEYS.users, users);
  localStorage.setItem(STORAGE_KEYS.passwords, JSON.stringify(passwordStore));
  setCurrentUser(user.id);
  addNotification(user.id, "system", "Welcome to Squad Finder. Start by exploring players or creating a team.");

  return { success: true, user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = getUserByEmail(email);
  if (!user) return { success: false, error: "User not found" };

  const passwordStore = getStore<{ userId: string; password: string }>(STORAGE_KEYS.passwords);
  const existingPassword = passwordStore.find((entry) => entry.userId === user.id)?.password;
  if (existingPassword !== password) return { success: false, error: "Incorrect password" };

  const loggedInAt = now();
  const users = getUsers().map((existingUser) =>
    existingUser.id === user.id
      ? { ...existingUser, online: true, lastLogin: loggedInAt, lastSeen: loggedInAt }
      : existingUser,
  );

  setStore(STORAGE_KEYS.users, users);
  setCurrentUser(user.id);

  return {
    success: true,
    user: users.find((existingUser) => existingUser.id === user.id),
  };
}

export async function logout() {
  const uid = getCurrentUserId();
  if (uid) {
    const users = getUsers().map((user) => (user.id === uid ? { ...user, online: false, lastSeen: now() } : user));
    setStore(STORAGE_KEYS.users, users);
  }

  clearStoreSession();
}

export async function updateProfile(id: string, data: ProfileUpdateData): Promise<StoreResult> {
  const existingUser = getUser(id);
  if (!existingUser) {
    return { success: false, error: "User not found" };
  }

  const nextUsername = data.username?.trim();
  if (nextUsername && nextUsername.length < 4) {
    return { success: false, error: "Username must be at least 4 characters" };
  }

  if (nextUsername && nextUsername.toLowerCase() !== existingUser.username.toLowerCase()) {
    const duplicateUser = getUsers().find(
      (user) => user.id !== id && user.username.toLowerCase() === nextUsername.toLowerCase(),
    );
    if (duplicateUser) {
      return { success: false, error: "Username already taken" };
    }
  }

  const nextGame = data.game || existingUser.game;
  const nextGameUid = data.gameUid?.trim() ?? existingUser.gameUid;
  const nextRealName = data.realName?.trim() ?? existingUser.realName;
  const nextContactNumber = data.contactNumber?.trim() ?? existingUser.contactNumber;
  const nextGameName = data.gameName?.trim() ?? existingUser.gameName;

  if (!nextRealName || !nextContactNumber || !nextGameUid || !nextGameName) {
    return { success: false, error: "Profile fields cannot be empty" };
  }

  const duplicateGameUid = getUsers().find(
    (user) => user.id !== id && user.game === nextGame && user.gameUid === nextGameUid,
  );
  if (duplicateGameUid) {
    return { success: false, error: "Game UID already registered for this game" };
  }

  const users = getUsers().map((user) =>
    user.id === id
      ? {
          ...user,
          username: nextUsername ?? user.username,
          realName: nextRealName,
          contactNumber: nextContactNumber,
          game: data.game ?? user.game,
          gameUid: nextGameUid,
          gameName: nextGameName,
          level: typeof data.level === "number" ? Math.min(100, Math.max(1, Math.floor(data.level))) : user.level,
          role: data.role ?? user.role,
          instagram: data.instagram ?? user.instagram,
          youtube: data.youtube ?? user.youtube,
          avatar: data.avatar ?? user.avatar,
          flagged: typeof data.flagged === "boolean" ? data.flagged : user.flagged,
        }
      : user,
  );

  setStore(STORAGE_KEYS.users, users);
  return { success: true };
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.currentUser);
}

function setCurrentUser(id: string) {
  localStorage.setItem(STORAGE_KEYS.currentUser, id);
  emitChange();
}

export function getCurrentUser(): UserProfile | undefined {
  const id = getCurrentUserId();
  return id ? getUser(id) : undefined;
}

export function getTeams(): Team[] {
  return getStore<Team>(STORAGE_KEYS.teams);
}

export function getTeam(id: string): Team | undefined {
  return getTeams().find((team) => team.teamId === id);
}

export async function createTeam(data: Omit<Team, "teamId" | "createdAt">): Promise<Team> {
  const team: Team = {
    ...data,
    maxMembers: Math.max(2, Math.floor(data.maxMembers) || 2),
    teamId: generateId(),
    createdAt: now(),
  };

  const teams = getTeams();
  teams.push(team);
  setStore(STORAGE_KEYS.teams, teams);

  return team;
}

export async function joinTeam(teamId: string, userId: string): Promise<StoreResult> {
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

export async function leaveTeam(teamId: string, userId: string) {
  const team = getTeam(teamId);
  if (!team) return;

  const remainingMembers = team.members.filter((memberId) => memberId !== userId);
  if (remainingMembers.length === 0) {
    await deleteTeam(teamId);
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

export async function deleteTeam(teamId: string) {
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

export async function sendInvite(teamId: string, senderId: string, receiverId: string): Promise<StoreResult> {
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

export async function respondInvite(inviteId: string, status: "accepted" | "rejected"): Promise<StoreResult> {
  const invite = getInvites().find((existingInvite) => existingInvite.inviteId === inviteId);
  if (!invite) return { success: false, error: "Invite not found" };

  if (status === "accepted") {
    const joinResult = await joinTeam(invite.teamId, invite.receiverId);
    if (!joinResult.success) {
      return { success: false, error: joinResult.error || "Could not join team" };
    }
  }

  const invites = getInvites().map((existingInvite) =>
    existingInvite.inviteId === inviteId ? { ...existingInvite, status } : existingInvite,
  );

  setStore(STORAGE_KEYS.invites, invites);

  const team = getTeam(invite.teamId);
  addNotification(
    invite.senderId,
    "invite_response",
    `${getUser(invite.receiverId)?.username || "A player"} ${status} your invite${team ? ` for ${team.teamName}` : ""}.`,
    invite.teamId,
  );

  return { success: true };
}

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
    .sort(
      (firstMessage, secondMessage) =>
        new Date(firstMessage.timestamp).getTime() - new Date(secondMessage.timestamp).getTime(),
    );
}

export function getChatPartners(userId: string): string[] {
  const messages = getMessages().filter((message) => message.senderId === userId || message.receiverId === userId);
  const partners = new Set(messages.map((message) => (message.senderId === userId ? message.receiverId : message.senderId)));
  return Array.from(partners);
}

export async function sendMessage(senderId: string, receiverId: string, text: string): Promise<ChatMessage> {
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

export async function markSeen(senderId: string, receiverId: string) {
  const messages = getMessages().map((message) =>
    message.senderId === senderId && message.receiverId === receiverId ? { ...message, seen: true } : message,
  );

  setStore(STORAGE_KEYS.messages, messages);
}

export function getNotifications(): Notification[] {
  return getStore<Notification>(STORAGE_KEYS.notifications);
}

export function getUserNotifications(userId: string): Notification[] {
  return getNotifications()
    .filter((notification) => notification.userId === userId)
    .sort(
      (firstNotification, secondNotification) =>
        new Date(secondNotification.createdAt).getTime() - new Date(firstNotification.createdAt).getTime(),
    );
}

export function getUnreadCount(userId: string): number {
  return getUserNotifications(userId).filter((notification) => !notification.seen).length;
}

export async function markNotificationsRead(userId: string) {
  const notifications = getNotifications().map((notification) =>
    notification.userId === userId ? { ...notification, seen: true } : notification,
  );

  setStore(STORAGE_KEYS.notifications, notifications);
}

export async function clearNotifications(userId: string) {
  setStore(
    STORAGE_KEYS.notifications,
    getNotifications().filter((notification) => notification.userId !== userId),
  );
}

export function getBlockedUsers(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`gf_blocked_${userId}`) || "[]");
  } catch {
    return [];
  }
}

export async function blockUser(userId: string, targetId: string) {
  const blockedUsers = getBlockedUsers(userId);
  if (!blockedUsers.includes(targetId)) {
    blockedUsers.push(targetId);
    localStorage.setItem(`gf_blocked_${userId}`, JSON.stringify(blockedUsers));
    emitChange();
  }
}

export async function reportUser(reporterId: string, targetId: string, reason: string) {
  const reports = getStore<{ id: string; reporterId: string; targetId: string; reason: string; createdAt: string }>(
    STORAGE_KEYS.reports,
  );

  reports.push({ id: generateId(), reporterId, targetId, reason, createdAt: now() });
  setStore(STORAGE_KEYS.reports, reports);

  const targetReports = reports.filter((report) => report.targetId === targetId);
  if (targetReports.length >= 3) {
    await updateProfile(targetId, { flagged: true });
  }
}
