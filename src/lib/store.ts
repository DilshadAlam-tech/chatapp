import { useEffect, useState } from "react";

import * as firebaseStore from "./firebaseStore";
import * as localStore from "./localStore";

export * from "./store-types";

const runtimeStore: typeof firebaseStore = import.meta.env.MODE === "test" ? localStore : firebaseStore;

export const subscribeStore = runtimeStore.subscribeStore;
export const initializeStoreSession = runtimeStore.initializeStoreSession;
export const clearStoreSession = runtimeStore.clearStoreSession;
export const fetchUserProfile = runtimeStore.fetchUserProfile;
export const getUsers = runtimeStore.getUsers;
export const getUser = runtimeStore.getUser;
export const signUp = runtimeStore.signUp;
export const login = runtimeStore.login;
export const logout = runtimeStore.logout;
export const updateProfile = runtimeStore.updateProfile;
export const getCurrentUserId = runtimeStore.getCurrentUserId;
export const getCurrentUser = runtimeStore.getCurrentUser;
export const getTeams = runtimeStore.getTeams;
export const getTeam = runtimeStore.getTeam;
export const createTeam = runtimeStore.createTeam;
export const joinTeam = runtimeStore.joinTeam;
export const leaveTeam = runtimeStore.leaveTeam;
export const deleteTeam = runtimeStore.deleteTeam;
export const getUserTeams = runtimeStore.getUserTeams;
export const getOpenTeams = runtimeStore.getOpenTeams;
export const getInvites = runtimeStore.getInvites;
export const getPendingInvite = runtimeStore.getPendingInvite;
export const getUserInvites = runtimeStore.getUserInvites;
export const getPendingInvitesForLeader = runtimeStore.getPendingInvitesForLeader;
export const sendInvite = runtimeStore.sendInvite;
export const respondInvite = runtimeStore.respondInvite;
export const getMessages = runtimeStore.getMessages;
export const getConversation = runtimeStore.getConversation;
export const getChatPartners = runtimeStore.getChatPartners;
export const sendMessage = runtimeStore.sendMessage;
export const markSeen = runtimeStore.markSeen;
export const getNotifications = runtimeStore.getNotifications;
export const getUserNotifications = runtimeStore.getUserNotifications;
export const getUnreadCount = runtimeStore.getUnreadCount;
export const markNotificationsRead = runtimeStore.markNotificationsRead;
export const clearNotifications = runtimeStore.clearNotifications;
export const getBlockedUsers = runtimeStore.getBlockedUsers;
export const blockUser = runtimeStore.blockUser;
export const reportUser = runtimeStore.reportUser;

export function useStoreSubscription() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return subscribeStore(() => {
      setVersion((currentValue) => currentValue + 1);
    });
  }, []);

  return version;
}
