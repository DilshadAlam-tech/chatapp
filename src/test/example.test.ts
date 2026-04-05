import { beforeEach, describe, expect, it } from "vitest";

import {
  createTeam,
  getTeam,
  getUserInvites,
  joinTeam,
  leaveTeam,
  login,
  seedDemoData,
  sendInvite,
  signUp,
} from "@/lib/store";

describe("store flows", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("requires the correct password to log in", () => {
    const result = signUp({
      username: "captain99",
      realName: "Captain",
      email: "captain@example.com",
      password: "secret99",
      contactNumber: "9999999999",
      game: "Free Fire Max",
      gameUid: "FF-9191",
      gameName: "CaptainFF",
      level: 30,
      role: "IGL",
      avatar: "",
    });

    expect(result.success).toBe(true);
    expect(login("captain@example.com", "wrongpass").success).toBe(false);
    expect(login("captain@example.com", "secret99").success).toBe(true);
  });

  it("prevents duplicate pending invites for the same player and team", () => {
    seedDemoData();

    expect(sendInvite("team1", "demo1", "demo3").success).toBe(true);
    expect(sendInvite("team1", "demo1", "demo3")).toEqual({
      success: false,
      error: "Invite already pending for this player",
    });
    expect(getUserInvites("demo3")).toHaveLength(1);
  });

  it("repairs demo accounts even when local storage already has old or custom users", () => {
    localStorage.setItem(
      "gf_users",
      JSON.stringify([
        {
          id: "demo1",
          username: "ShadowX",
          realName: "Alex Singh",
          email: "alex@demo.com",
          contactNumber: "9999999991",
          game: "Free Fire Max",
          gameUid: "FF001",
          gameName: "ShadowX_FF",
          level: 78,
          role: "IGL",
          verified: true,
          flagged: false,
          online: false,
          lastSeen: new Date().toISOString(),
          activityScore: 920,
          deviceId: "demo",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
        {
          id: "custom1",
          username: "CustomUser",
          realName: "Custom User",
          email: "custom@example.com",
          password: "custom123",
          contactNumber: "9777777777",
          game: "BGMI",
          gameUid: "BG-CUSTOM",
          gameName: "CustomBG",
          level: 20,
          role: "Support",
          verified: false,
          flagged: false,
          online: false,
          lastSeen: new Date().toISOString(),
          activityScore: 40,
          deviceId: "custom-device",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
      ]),
    );

    seedDemoData();

    expect(login("alex@demo.com", "demo1234").success).toBe(true);
    expect(login("custom@example.com", "custom123").success).toBe(true);
  });

  it("reassigns team leadership when the captain leaves", () => {
    seedDemoData();

    expect(joinTeam("team1", "demo3").success).toBe(true);
    leaveTeam("team1", "demo1");

    const team = getTeam("team1");
    expect(team?.leaderId).toBe("demo4");
    expect(team?.members).toEqual(["demo4", "demo3"]);
  });

  it("deletes a team when the only member leaves", () => {
    const signUpResult = signUp({
      username: "solo88",
      realName: "Solo User",
      email: "solo@example.com",
      password: "secret88",
      contactNumber: "9888888888",
      game: "BGMI",
      gameUid: "BG-8181",
      gameName: "SoloBGMI",
      level: 12,
      role: "Support",
      avatar: "",
    });

    expect(signUpResult.user).toBeTruthy();

    const team = createTeam({
      teamName: "Solo Queue",
      game: "BGMI",
      leaderId: signUpResult.user!.id,
      members: [signUpResult.user!.id],
      maxMembers: 4,
      description: "",
    });

    leaveTeam(team.teamId, signUpResult.user!.id);
    expect(getTeam(team.teamId)).toBeUndefined();
  });
});
