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
  createdAt: string;
  lastLogin: string;
}

export interface SignUpData {
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
}

export interface ProfileUpdateData {
  username?: string;
  realName?: string;
  contactNumber?: string;
  game?: GameType;
  gameUid?: string;
  gameName?: string;
  level?: number;
  role?: RoleType;
  instagram?: string;
  youtube?: string;
  avatar?: string;
  flagged?: boolean;
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

export interface StoreResult {
  success: boolean;
  error?: string;
}

export interface AuthResult extends StoreResult {
  user?: UserProfile;
}
