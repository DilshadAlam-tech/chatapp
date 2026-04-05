import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { auth, db } from "./firebase";
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
type Unsubscribe = () => void;

interface BlockRecord {
  userId: string;
  targetId: string;
}

interface UserDocument extends Omit<UserProfile, "id"> {
  usernameLower: string;
}

const listeners = new Set<StoreListener>();

const state: {
  currentUserId: string | null;
  users: UserProfile[];
  teams: Team[];
  invites: Invite[];
  messages: ChatMessage[];
  notifications: Notification[];
  blocks: BlockRecord[];
} = {
  currentUserId: null,
  users: [],
  teams: [],
  invites: [],
  messages: [],
  notifications: [],
  blocks: [],
};

const inviteBuckets = {
  sent: [] as Invite[],
  received: [] as Invite[],
};

const messageBuckets = {
  sent: [] as ChatMessage[],
  received: [] as ChatMessage[],
};

let activeSessionId: string | null = null;
let activeSessionUnsubs: Unsubscribe[] = [];

const now = () => new Date().toISOString();
const clampLevel = (value: number) => Math.min(100, Math.max(1, Math.floor(value) || 1));

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string) => {
  const byKey = new Map<string, T>();

  items.forEach((item) => {
    byKey.set(getKey(item), item);
  });

  return Array.from(byKey.values());
};

const sortUsers = (users: UserProfile[]) =>
  [...users].sort((firstUser, secondUser) => firstUser.username.localeCompare(secondUser.username));

const sortTeams = (teams: Team[]) =>
  [...teams].sort((firstTeam, secondTeam) => secondTeam.createdAt.localeCompare(firstTeam.createdAt));

const sortInvites = (invites: Invite[]) =>
  [...invites].sort((firstInvite, secondInvite) => secondInvite.createdAt.localeCompare(firstInvite.createdAt));

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort((firstMessage, secondMessage) => firstMessage.timestamp.localeCompare(secondMessage.timestamp));

const sortNotifications = (notifications: Notification[]) =>
  [...notifications].sort((firstNotification, secondNotification) =>
    secondNotification.createdAt.localeCompare(firstNotification.createdAt),
  );

const sanitizeUser = (id: string, data: Partial<UserDocument>): UserProfile => ({
  id,
  username: data.username || "",
  realName: data.realName || "",
  email: data.email || "",
  contactNumber: data.contactNumber || "",
  game: (data.game as GameType) || "Free Fire Max",
  gameUid: data.gameUid || "",
  gameName: data.gameName || "",
  level: clampLevel(Number(data.level)),
  role: data.role || "Support",
  avatar: data.avatar || "",
  verified: Boolean(data.verified),
  flagged: Boolean(data.flagged),
  online: Boolean(data.online),
  lastSeen: data.lastSeen || now(),
  activityScore: Number(data.activityScore) || 50,
  instagram: data.instagram || "",
  youtube: data.youtube || "",
  createdAt: data.createdAt || now(),
  lastLogin: data.lastLogin || data.createdAt || now(),
});

const sanitizeTeam = (id: string, data: Partial<Team>): Team => ({
  teamId: id,
  teamName: data.teamName || "",
  game: (data.game as GameType) || "Free Fire Max",
  leaderId: data.leaderId || "",
  members: Array.isArray(data.members) ? data.members.filter(Boolean) : [],
  maxMembers: Math.max(2, Math.floor(Number(data.maxMembers)) || 2),
  description: data.description || "",
  createdAt: data.createdAt || now(),
});

const sanitizeInvite = (id: string, data: Partial<Invite>): Invite => ({
  inviteId: id,
  teamId: data.teamId || "",
  senderId: data.senderId || "",
  receiverId: data.receiverId || "",
  status: data.status || "pending",
  createdAt: data.createdAt || now(),
});

const sanitizeMessage = (id: string, data: Partial<ChatMessage>): ChatMessage => ({
  id,
  senderId: data.senderId || "",
  receiverId: data.receiverId || "",
  text: data.text || "",
  timestamp: data.timestamp || now(),
  seen: Boolean(data.seen),
});

const sanitizeNotification = (id: string, data: Partial<Notification>): Notification => ({
  id,
  userId: data.userId || "",
  type: data.type || "system",
  message: data.message || "",
  seen: Boolean(data.seen),
  createdAt: data.createdAt || now(),
  relatedId: data.relatedId,
});

const mergeInvites = () => {
  state.invites = sortInvites(dedupeByKey([...inviteBuckets.sent, ...inviteBuckets.received], (invite) => invite.inviteId));
  emitChange();
};

const mergeMessages = () => {
  state.messages = sortMessages(dedupeByKey([...messageBuckets.sent, ...messageBuckets.received], (message) => message.id));
  emitChange();
};

const resetState = () => {
  state.currentUserId = null;
  state.users = [];
  state.teams = [];
  state.invites = [];
  state.messages = [];
  state.notifications = [];
  state.blocks = [];
  inviteBuckets.sent = [];
  inviteBuckets.received = [];
  messageBuckets.sent = [];
  messageBuckets.received = [];
  emitChange();
};

const mapAuthError = (error: unknown, fallback: string) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Email already registered";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password";
    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return "Enable Email/Password sign-in in Firebase Authentication for this project.";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/network-request-failed":
      return "Network error. Please try again";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Firestore rules are blocking access. Update your database permissions.";
    default:
      return fallback;
  }
};

const createNotification = async (
  userId: string,
  type: Notification["type"],
  message: string,
  relatedId?: string,
) => {
  const notificationRef = doc(collection(db, "notifications"));
  const createdAt = now();

  await setDoc(notificationRef, {
    id: notificationRef.id,
    userId,
    type,
    message,
    seen: false,
    createdAt,
    relatedId: relatedId || "",
  });
};

const setPresence = async (userId: string, online: boolean, updateLastLogin = false) => {
  const payload: Partial<UserProfile> = {
    online,
    lastSeen: now(),
  };

  if (online && updateLastLogin) {
    payload.lastLogin = payload.lastSeen;
  }

  await updateDoc(doc(db, "users", userId), payload);
};

const getUserDoc = async (userId: string) => {
  const userSnapshot = await getDoc(doc(db, "users", userId));
  if (!userSnapshot.exists()) return null;
  return sanitizeUser(userSnapshot.id, userSnapshot.data() as Partial<UserDocument>);
};

const removeTeamInvites = async (teamId: string) => {
  const inviteQuery = query(collection(db, "invites"), where("teamId", "==", teamId));
  const inviteSnapshot = await getDocs(inviteQuery);
  const batch = writeBatch(db);

  inviteSnapshot.forEach((inviteDoc) => {
    batch.delete(inviteDoc.ref);
  });

  await batch.commit();
};

const getInviteById = async (inviteId: string) => {
  const cachedInvite = state.invites.find((invite) => invite.inviteId === inviteId);
  if (cachedInvite) return cachedInvite;

  const inviteSnapshot = await getDoc(doc(db, "invites", inviteId));
  if (!inviteSnapshot.exists()) return null;
  return sanitizeInvite(inviteSnapshot.id, inviteSnapshot.data() as Partial<Invite>);
};

const getPendingInviteForReceiver = (teamId: string, receiverId: string) =>
  state.invites.find(
    (invite) => invite.teamId === teamId && invite.receiverId === receiverId && invite.status === "pending",
  );

const swallowSnapshotError = () => {
  // We surface write/read failures through action results. Snapshot listeners should not crash the app shell.
};

export function subscribeStore(listener: StoreListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function initializeStoreSession(userId: string) {
  if (activeSessionId === userId && activeSessionUnsubs.length > 0) {
    state.currentUserId = userId;
    return;
  }

  clearStoreSession();

  activeSessionId = userId;
  state.currentUserId = userId;

  activeSessionUnsubs = [
    onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        state.users = sortUsers(
          snapshot.docs.map((userDoc) => sanitizeUser(userDoc.id, userDoc.data() as Partial<UserDocument>)),
        );
        emitChange();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        state.teams = sortTeams(snapshot.docs.map((teamDoc) => sanitizeTeam(teamDoc.id, teamDoc.data() as Partial<Team>)));
        emitChange();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "invites"), where("senderId", "==", userId)),
      (snapshot) => {
        inviteBuckets.sent = snapshot.docs.map((inviteDoc) =>
          sanitizeInvite(inviteDoc.id, inviteDoc.data() as Partial<Invite>),
        );
        mergeInvites();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "invites"), where("receiverId", "==", userId)),
      (snapshot) => {
        inviteBuckets.received = snapshot.docs.map((inviteDoc) =>
          sanitizeInvite(inviteDoc.id, inviteDoc.data() as Partial<Invite>),
        );
        mergeInvites();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "messages"), where("senderId", "==", userId)),
      (snapshot) => {
        messageBuckets.sent = snapshot.docs.map((messageDoc) =>
          sanitizeMessage(messageDoc.id, messageDoc.data() as Partial<ChatMessage>),
        );
        mergeMessages();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "messages"), where("receiverId", "==", userId)),
      (snapshot) => {
        messageBuckets.received = snapshot.docs.map((messageDoc) =>
          sanitizeMessage(messageDoc.id, messageDoc.data() as Partial<ChatMessage>),
        );
        mergeMessages();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "notifications"), where("userId", "==", userId)),
      (snapshot) => {
        state.notifications = sortNotifications(
          snapshot.docs.map((notificationDoc) =>
            sanitizeNotification(notificationDoc.id, notificationDoc.data() as Partial<Notification>),
          ),
        );
        emitChange();
      },
      swallowSnapshotError,
    ),
    onSnapshot(
      query(collection(db, "blocks"), where("userId", "==", userId)),
      (snapshot) => {
        state.blocks = snapshot.docs.map((blockDoc) => {
          const data = blockDoc.data() as Partial<BlockRecord>;
          return {
            userId: data.userId || userId,
            targetId: data.targetId || "",
          };
        });
        emitChange();
      },
      swallowSnapshotError,
    ),
  ];

  try {
    await setPresence(userId, true);
  } catch {
    // Presence is best-effort. The app still works even if this update fails.
  }
}

export function clearStoreSession() {
  activeSessionUnsubs.forEach((unsubscribe) => unsubscribe());
  activeSessionUnsubs = [];
  activeSessionId = null;
  resetState();
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const cachedUser = state.users.find((user) => user.id === userId);
  if (cachedUser) return cachedUser;

  return getUserDoc(userId);
}

export function getUsers(): UserProfile[] {
  return state.users;
}

export function getUser(id: string): UserProfile | undefined {
  return state.users.find((user) => user.id === id);
}

export async function signUp(data: SignUpData): Promise<AuthResult> {
  const username = data.username.trim();
  const realName = data.realName.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();
  const contactNumber = data.contactNumber.trim();
  const gameUid = data.gameUid.trim();
  const gameName = data.gameName.trim();

  if (!username || !realName || !email || !password || !contactNumber || !data.game || !gameUid || !gameName || !data.role) {
    return { success: false, error: "All fields are required" };
  }

  if (username.length < 4) return { success: false, error: "Username must be at least 4 characters" };
  if (password.length < 6) return { success: false, error: "Password must be at least 6 characters" };

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    try {
      const usernameSnapshot = await getDocs(query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase())));
      if (!usernameSnapshot.empty) {
        await deleteUser(credential.user);
        return { success: false, error: "Username already taken" };
      }

      const gameUidSnapshot = await getDocs(query(collection(db, "users"), where("gameUid", "==", gameUid)));
      const duplicateUid = gameUidSnapshot.docs.some((userDoc) => {
        const existingUser = userDoc.data() as Partial<UserDocument>;
        return existingUser.game === data.game;
      });

      if (duplicateUid) {
        await deleteUser(credential.user);
        return { success: false, error: "Game UID already registered for this game" };
      }

      const createdAt = now();
      const userProfile: UserProfile = {
        id: credential.user.uid,
        username,
        realName,
        email,
        contactNumber,
        game: data.game,
        gameUid,
        gameName,
        level: clampLevel(data.level),
        role: data.role,
        avatar: data.avatar || "",
        verified: false,
        flagged: false,
        online: true,
        lastSeen: createdAt,
        activityScore: 50,
        instagram: "",
        youtube: "",
        createdAt,
        lastLogin: createdAt,
      };

      const userDocument: UserDocument = {
        username: userProfile.username,
        usernameLower: username.toLowerCase(),
        realName: userProfile.realName,
        email: userProfile.email,
        contactNumber: userProfile.contactNumber,
        game: userProfile.game,
        gameUid: userProfile.gameUid,
        gameName: userProfile.gameName,
        level: userProfile.level,
        role: userProfile.role,
        avatar: userProfile.avatar,
        verified: userProfile.verified,
        flagged: userProfile.flagged,
        online: userProfile.online,
        lastSeen: userProfile.lastSeen,
        activityScore: userProfile.activityScore,
        instagram: userProfile.instagram,
        youtube: userProfile.youtube,
        createdAt: userProfile.createdAt,
        lastLogin: userProfile.lastLogin,
      };

      await setDoc(doc(db, "users", userProfile.id), {
        ...userDocument,
      });

      await createNotification(
        userProfile.id,
        "system",
        "Welcome to Squad Finder. Start by exploring players or creating a team.",
      );

      await initializeStoreSession(userProfile.id);
      return { success: true, user: userProfile };
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } catch {
        // If cleanup fails, we still want to surface the original issue.
      }

      return { success: false, error: mapAuthError(error, "Could not create profile") };
    }
  } catch (error) {
    return { success: false, error: mapAuthError(error, "Signup failed") };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await setPresence(credential.user.uid, true, true);
    await initializeStoreSession(credential.user.uid);

    const profile = await fetchUserProfile(credential.user.uid);
    if (!profile) {
      await signOut(auth);
      clearStoreSession();
      return { success: false, error: "User profile not found" };
    }

    return {
      success: true,
      user: {
        ...profile,
        online: true,
        lastLogin: now(),
        lastSeen: now(),
      },
    };
  } catch (error) {
    return { success: false, error: mapAuthError(error, "Login failed") };
  }
}

export async function logout() {
  const currentUserId = auth.currentUser?.uid || state.currentUserId;

  if (currentUserId) {
    try {
      await setPresence(currentUserId, false);
    } catch {
      // Presence update should not block logout.
    }
  }

  await signOut(auth);
  clearStoreSession();
}

export async function updateProfile(id: string, data: ProfileUpdateData): Promise<StoreResult> {
  if (auth.currentUser?.uid !== id) {
    return { success: false, error: "You can only edit your own profile" };
  }

  const existingUser = await fetchUserProfile(id);
  if (!existingUser) {
    return { success: false, error: "User not found" };
  }

  const nextUsername = data.username?.trim() ?? existingUser.username;
  const nextRealName = data.realName?.trim() ?? existingUser.realName;
  const nextContactNumber = data.contactNumber?.trim() ?? existingUser.contactNumber;
  const nextGame = data.game ?? existingUser.game;
  const nextGameUid = data.gameUid?.trim() ?? existingUser.gameUid;
  const nextGameName = data.gameName?.trim() ?? existingUser.gameName;
  const nextLevel = typeof data.level === "number" ? clampLevel(data.level) : existingUser.level;
  const nextRole = data.role ?? existingUser.role;

  if (nextUsername.length < 4) {
    return { success: false, error: "Username must be at least 4 characters" };
  }

  if (!nextRealName || !nextContactNumber || !nextGameUid || !nextGameName) {
    return { success: false, error: "Profile fields cannot be empty" };
  }

  if (nextUsername.toLowerCase() !== existingUser.username.toLowerCase()) {
    const usernameSnapshot = await getDocs(query(collection(db, "users"), where("usernameLower", "==", nextUsername.toLowerCase())));
    const takenByAnotherUser = usernameSnapshot.docs.some((userDoc) => userDoc.id !== id);
    if (takenByAnotherUser) {
      return { success: false, error: "Username already taken" };
    }
  }

  if (nextGameUid !== existingUser.gameUid || nextGame !== existingUser.game) {
    const gameUidSnapshot = await getDocs(query(collection(db, "users"), where("gameUid", "==", nextGameUid)));
    const duplicateUid = gameUidSnapshot.docs.some((userDoc) => {
      if (userDoc.id === id) return false;
      const existingData = userDoc.data() as Partial<UserDocument>;
      return existingData.game === nextGame;
    });

    if (duplicateUid) {
      return { success: false, error: "Game UID already registered for this game" };
    }
  }

  const payload: Partial<UserDocument> = {
    username: nextUsername,
    usernameLower: nextUsername.toLowerCase(),
    realName: nextRealName,
    contactNumber: nextContactNumber,
    game: nextGame,
    gameUid: nextGameUid,
    gameName: nextGameName,
    level: nextLevel,
    role: nextRole,
  };

  if (typeof data.instagram === "string") payload.instagram = data.instagram;
  if (typeof data.youtube === "string") payload.youtube = data.youtube;
  if (typeof data.avatar === "string") payload.avatar = data.avatar;

  await updateDoc(doc(db, "users", id), payload);
  return { success: true };
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || state.currentUserId;
}

export function getCurrentUser(): UserProfile | undefined {
  const currentUserId = getCurrentUserId();
  return currentUserId ? getUser(currentUserId) : undefined;
}

export function getTeams(): Team[] {
  return state.teams;
}

export function getTeam(id: string): Team | undefined {
  return state.teams.find((team) => team.teamId === id);
}

export async function createTeam(data: Omit<Team, "teamId" | "createdAt">): Promise<Team> {
  const teamRef = doc(collection(db, "teams"));
  const team: Team = {
    ...data,
    teamId: teamRef.id,
    maxMembers: Math.max(2, Math.floor(data.maxMembers) || 2),
    createdAt: now(),
  };

  await setDoc(teamRef, team);
  return team;
}

export async function joinTeam(teamId: string, userId: string): Promise<StoreResult> {
  try {
    await runTransaction(db, async (transaction) => {
      const teamRef = doc(db, "teams", teamId);
      const teamSnapshot = await transaction.get(teamRef);

      if (!teamSnapshot.exists()) {
        throw new Error("Team not found");
      }

      const team = sanitizeTeam(teamSnapshot.id, teamSnapshot.data() as Partial<Team>);

      if (team.members.includes(userId)) {
        throw new Error("You are already in this team");
      }

      if (team.members.length >= team.maxMembers) {
        throw new Error("Team is already full");
      }

      transaction.update(teamRef, {
        members: [...team.members, userId],
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not join team",
    };
  }
}

export async function leaveTeam(teamId: string, userId: string) {
  await runTransaction(db, async (transaction) => {
    const teamRef = doc(db, "teams", teamId);
    const teamSnapshot = await transaction.get(teamRef);
    if (!teamSnapshot.exists()) return;

    const team = sanitizeTeam(teamSnapshot.id, teamSnapshot.data() as Partial<Team>);
    const remainingMembers = team.members.filter((memberId) => memberId !== userId);

    if (remainingMembers.length === 0) {
      transaction.delete(teamRef);
      return;
    }

    const nextLeaderId = team.leaderId === userId ? remainingMembers[0] : team.leaderId;
    transaction.update(teamRef, {
      members: remainingMembers,
      leaderId: nextLeaderId,
    });
  });

  const latestTeam = await getDoc(doc(db, "teams", teamId));
  if (!latestTeam.exists()) {
    await removeTeamInvites(teamId);
  }
}

export async function deleteTeam(teamId: string) {
  await deleteDoc(doc(db, "teams", teamId));
  await removeTeamInvites(teamId);
}

export function getUserTeams(userId: string): Team[] {
  return state.teams.filter((team) => team.members.includes(userId));
}

export function getOpenTeams(excludeUserId?: string): Team[] {
  return state.teams.filter((team) => {
    if (team.members.length >= team.maxMembers) return false;
    if (excludeUserId && team.members.includes(excludeUserId)) return false;
    return true;
  });
}

export function getInvites(): Invite[] {
  return state.invites;
}

export function getPendingInvite(teamId: string, receiverId: string): Invite | undefined {
  return getPendingInviteForReceiver(teamId, receiverId);
}

export function getUserInvites(userId: string): Invite[] {
  return state.invites.filter((invite) => invite.receiverId === userId && invite.status === "pending");
}

export function getPendingInvitesForLeader(leaderId: string): Invite[] {
  const leaderTeamIds = state.teams.filter((team) => team.leaderId === leaderId).map((team) => team.teamId);

  return state.invites.filter((invite) => leaderTeamIds.includes(invite.teamId) && invite.status === "pending");
}

export async function sendInvite(teamId: string, senderId: string, receiverId: string): Promise<StoreResult> {
  if (senderId === receiverId) return { success: false, error: "You cannot invite yourself" };

  const team = getTeam(teamId);
  if (!team) return { success: false, error: "Team not found" };
  if (team.leaderId !== senderId) return { success: false, error: "Only the team leader can send invites" };
  if (team.members.includes(receiverId)) return { success: false, error: "Player is already in this team" };
  if (team.members.length >= team.maxMembers) return { success: false, error: "Team is already full" };
  if (getPendingInviteForReceiver(teamId, receiverId)) return { success: false, error: "Invite already pending for this player" };

  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const recentInvites = state.invites.filter((invite) => invite.senderId === senderId && invite.createdAt > hourAgo);
  if (recentInvites.length >= 5) return { success: false, error: "Max 5 invites per hour" };

  const inviteRef = doc(collection(db, "invites"));
  const invite: Invite = {
    inviteId: inviteRef.id,
    teamId,
    senderId,
    receiverId,
    status: "pending",
    createdAt: now(),
  };

  await setDoc(inviteRef, invite);
  await createNotification(receiverId, "invite", `${team.teamName} invited you to join the squad.`, teamId);

  return { success: true };
}

export async function respondInvite(inviteId: string, status: "accepted" | "rejected"): Promise<StoreResult> {
  const invite = await getInviteById(inviteId);
  if (!invite) return { success: false, error: "Invite not found" };

  try {
    const transactionResult = await runTransaction(db, async (transaction) => {
      const inviteRef = doc(db, "invites", inviteId);
      const inviteSnapshot = await transaction.get(inviteRef);

      if (!inviteSnapshot.exists()) {
        throw new Error("Invite not found");
      }

      const currentInvite = sanitizeInvite(inviteSnapshot.id, inviteSnapshot.data() as Partial<Invite>);
      if (currentInvite.status !== "pending") {
        throw new Error("Invite already handled");
      }

      let teamName = "";

      if (status === "accepted") {
        const teamRef = doc(db, "teams", currentInvite.teamId);
        const teamSnapshot = await transaction.get(teamRef);

        if (!teamSnapshot.exists()) {
          throw new Error("Team not found");
        }

        const team = sanitizeTeam(teamSnapshot.id, teamSnapshot.data() as Partial<Team>);
        teamName = team.teamName;

        if (team.members.includes(currentInvite.receiverId)) {
          throw new Error("You are already in this team");
        }

        if (team.members.length >= team.maxMembers) {
          throw new Error("Team is already full");
        }

        transaction.update(teamRef, {
          members: [...team.members, currentInvite.receiverId],
        });
      }

      transaction.update(inviteRef, {
        status,
      });

      return {
        senderId: currentInvite.senderId,
        receiverId: currentInvite.receiverId,
        teamId: currentInvite.teamId,
        teamName,
      };
    });

    const receiver = await fetchUserProfile(transactionResult.receiverId);
    const teamName = transactionResult.teamName || getTeam(invite.teamId)?.teamName || "";

    await createNotification(
      transactionResult.senderId,
      "invite_response",
      `${receiver?.username || "A player"} ${status} your invite${teamName ? ` for ${teamName}` : ""}.`,
      transactionResult.teamId,
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not update invite",
    };
  }
}

export function getMessages(): ChatMessage[] {
  return state.messages;
}

export function getConversation(userId1: string, userId2: string): ChatMessage[] {
  return state.messages.filter(
    (message) =>
      (message.senderId === userId1 && message.receiverId === userId2) ||
      (message.senderId === userId2 && message.receiverId === userId1),
  );
}

export function getChatPartners(userId: string): string[] {
  const partners = new Set<string>();

  state.messages.forEach((message) => {
    if (message.senderId === userId) {
      partners.add(message.receiverId);
    } else if (message.receiverId === userId) {
      partners.add(message.senderId);
    }
  });

  return Array.from(partners);
}

export async function sendMessage(senderId: string, receiverId: string, text: string): Promise<ChatMessage> {
  const messageRef = doc(collection(db, "messages"));
  const message: ChatMessage = {
    id: messageRef.id,
    senderId,
    receiverId,
    text,
    timestamp: now(),
    seen: false,
  };

  await setDoc(messageRef, message);
  await createNotification(receiverId, "chat", `New message from ${getUser(senderId)?.username || "someone"}`, senderId);

  return message;
}

export async function markSeen(senderId: string, receiverId: string) {
  const unseenMessages = state.messages.filter(
    (message) => message.senderId === senderId && message.receiverId === receiverId && !message.seen,
  );

  if (unseenMessages.length === 0) return;

  const batch = writeBatch(db);
  unseenMessages.forEach((message) => {
    batch.update(doc(db, "messages", message.id), {
      seen: true,
    });
  });

  await batch.commit();
}

export function getNotifications(): Notification[] {
  return state.notifications;
}

export function getUserNotifications(userId: string): Notification[] {
  return state.notifications.filter((notification) => notification.userId === userId);
}

export function getUnreadCount(userId: string): number {
  return getUserNotifications(userId).filter((notification) => !notification.seen).length;
}

export async function markNotificationsRead(userId: string) {
  const unreadNotifications = state.notifications.filter((notification) => notification.userId === userId && !notification.seen);
  if (unreadNotifications.length === 0) return;

  const batch = writeBatch(db);
  unreadNotifications.forEach((notification) => {
    batch.update(doc(db, "notifications", notification.id), {
      seen: true,
    });
  });

  await batch.commit();
}

export async function clearNotifications(userId: string) {
  const userNotifications = state.notifications.filter((notification) => notification.userId === userId);
  if (userNotifications.length === 0) return;

  const batch = writeBatch(db);
  userNotifications.forEach((notification) => {
    batch.delete(doc(db, "notifications", notification.id));
  });

  await batch.commit();
}

export function getBlockedUsers(userId: string): string[] {
  if (state.currentUserId !== userId) return [];
  return state.blocks.map((block) => block.targetId);
}

export async function blockUser(userId: string, targetId: string) {
  const blockId = `${userId}_${targetId}`;
  await setDoc(doc(db, "blocks", blockId), {
    userId,
    targetId,
    createdAt: now(),
  });
}

export async function reportUser(reporterId: string, targetId: string, reason: string) {
  await addDoc(collection(db, "reports"), {
    reporterId,
    targetId,
    reason,
    createdAt: now(),
  });

  const reportsSnapshot = await getDocs(query(collection(db, "reports"), where("targetId", "==", targetId)));
  if (reportsSnapshot.size >= 3) {
    await updateDoc(doc(db, "users", targetId), {
      flagged: true,
    });
  }
}
