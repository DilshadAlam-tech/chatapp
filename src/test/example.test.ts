import { beforeEach, describe, expect, it } from "vitest";

import {
  createTeam,
  getTeam,
  getUser,
  getUserInvites,
  getUserTeams,
  joinTeam,
  leaveTeam,
  login,
  respondInvite,
  sendInvite,
  signUp,
  updateProfile,
} from "@/lib/store";

describe("store flows", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createUser = (overrides: Partial<Parameters<typeof signUp>[0]> = {}) => {
    return signUp({
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
      ...overrides,
    });
  };

  it("requires the correct password to log in", async () => {
    const result = await createUser();

    expect(result.success).toBe(true);
    expect((await login("captain@example.com", "wrongpass")).success).toBe(false);
    expect((await login("captain@example.com", "secret99")).success).toBe(true);
  });

  it("prevents duplicate pending invites for the same player and team", async () => {
    const leader = await createUser();
    const recruit = await createUser({
      username: "scout33",
      realName: "Scout",
      email: "scout@example.com",
      password: "secret33",
      contactNumber: "9888888881",
      gameUid: "FF-3333",
      gameName: "ScoutFF",
      level: 24,
      role: "Sniper",
    });

    expect(leader.user).toBeTruthy();
    expect(recruit.user).toBeTruthy();

    const team = await createTeam({
      teamName: "Alpha Squad",
      game: "Free Fire Max",
      leaderId: leader.user!.id,
      members: [leader.user!.id],
      maxMembers: 4,
      description: "Rank push team",
    });

    expect((await sendInvite(team.teamId, leader.user!.id, recruit.user!.id)).success).toBe(true);
    expect(await sendInvite(team.teamId, leader.user!.id, recruit.user!.id)).toEqual({
      success: false,
      error: "Invite already pending for this player",
    });
    expect(getUserInvites(recruit.user!.id)).toHaveLength(1);
  });

  it("reassigns team leadership when the captain leaves", async () => {
    const leader = await createUser();
    const teammate = await createUser({
      username: "support88",
      realName: "Support",
      email: "support@example.com",
      password: "secret88",
      contactNumber: "9888888882",
      gameUid: "FF-8888",
      gameName: "SupportFF",
      level: 27,
      role: "Support",
    });
    const newJoiner = await createUser({
      username: "rusher11",
      realName: "Rusher",
      email: "rusher@example.com",
      password: "secret11",
      contactNumber: "9888888883",
      gameUid: "FF-1111",
      gameName: "RushFF",
      level: 22,
      role: "Primary Rusher",
    });

    expect(leader.user).toBeTruthy();
    expect(teammate.user).toBeTruthy();
    expect(newJoiner.user).toBeTruthy();

    const team = await createTeam({
      teamName: "Captain's Team",
      game: "Free Fire Max",
      leaderId: leader.user!.id,
      members: [leader.user!.id, teammate.user!.id],
      maxMembers: 4,
      description: "Rotation practice",
    });

    expect((await joinTeam(team.teamId, newJoiner.user!.id)).success).toBe(true);
    await leaveTeam(team.teamId, leader.user!.id);

    const updatedTeam = getTeam(team.teamId);
    expect(updatedTeam?.leaderId).toBe(teammate.user!.id);
    expect(updatedTeam?.members).toEqual([teammate.user!.id, newJoiner.user!.id]);
  });

  it("keeps an invite pending when accepting would join a full team", async () => {
    const leader = await createUser();
    const teammate = await createUser(
      {
        username: "support88",
        realName: "Support",
        email: "support@example.com",
        password: "secret88",
        contactNumber: "9888888882",
        gameUid: "FF-8888",
        gameName: "SupportFF",
        level: 27,
        role: "Support",
      },
    );
    const recruit = await createUser(
      {
        username: "rusher11",
        realName: "Rusher",
        email: "rusher@example.com",
        password: "secret11",
        contactNumber: "9888888883",
        gameUid: "FF-1111",
        gameName: "RushFF",
        level: 22,
        role: "Primary Rusher",
      },
    );

    expect(leader.user).toBeTruthy();
    expect(teammate.user).toBeTruthy();
    expect(recruit.user).toBeTruthy();

    const team = await createTeam({
      teamName: "Full Team",
      game: "Free Fire Max",
      leaderId: leader.user!.id,
      members: [leader.user!.id],
      maxMembers: 2,
      description: "Fills up after the invite is sent",
    });

    expect((await sendInvite(team.teamId, leader.user!.id, recruit.user!.id)).success).toBe(true);
    expect((await joinTeam(team.teamId, teammate.user!.id)).success).toBe(true);

    const invite = getUserInvites(recruit.user!.id)[0];
    const result = await respondInvite(invite.inviteId, "accepted");

    expect(result).toEqual({
      success: false,
      error: "Team is already full",
    });
    expect(getUserInvites(recruit.user!.id)).toHaveLength(1);
    expect(getUserTeams(recruit.user!.id)).toHaveLength(0);
    expect(getTeam(team.teamId)?.members).toEqual([leader.user!.id, teammate.user!.id]);
  });

  it("deletes a team when the only member leaves", async () => {
    const signUpResult = await signUp({
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

    const team = await createTeam({
      teamName: "Solo Queue",
      game: "BGMI",
      leaderId: signUpResult.user!.id,
      members: [signUpResult.user!.id],
      maxMembers: 4,
      description: "",
    });

    await leaveTeam(team.teamId, signUpResult.user!.id);
    expect(getTeam(team.teamId)).toBeUndefined();
  });

  it("allows creating teams with more than six max members", async () => {
    const signUpResult = await signUp({
      username: "large88",
      realName: "Large Team",
      email: "large@example.com",
      password: "secret88",
      contactNumber: "9777777777",
      game: "BGMI",
      gameUid: "BG-LARGE",
      gameName: "LargeBGMI",
      level: 18,
      role: "Support",
      avatar: "",
    });

    expect(signUpResult.user).toBeTruthy();

    const team = await createTeam({
      teamName: "Big Roster",
      game: "BGMI",
      leaderId: signUpResult.user!.id,
      members: [signUpResult.user!.id],
      maxMembers: 12,
      description: "",
    });

    expect(team.maxMembers).toBe(12);
  });

  it("lets a user update core profile details", async () => {
    const signUpResult = await signUp({
      username: "editor88",
      realName: "Edit User",
      email: "editor@example.com",
      password: "secret88",
      contactNumber: "9666666666",
      game: "Free Fire Max",
      gameUid: "FF-EDIT-01",
      gameName: "EditorFF",
      level: 15,
      role: "Support",
      avatar: "",
    });

    expect(signUpResult.user).toBeTruthy();

    const result = await updateProfile(signUpResult.user!.id, {
      username: "editor99",
      realName: "Updated User",
      contactNumber: "9555555555",
      game: "BGMI",
      gameUid: "BG-EDIT-99",
      gameName: "UpdatedIGN",
      level: 44,
      role: "Sniper",
      instagram: "https://instagram.com/editor99",
    });

    expect(result).toEqual({ success: true });
    expect(getUser(signUpResult.user!.id)).toMatchObject({
      username: "editor99",
      realName: "Updated User",
      contactNumber: "9555555555",
      game: "BGMI",
      gameUid: "BG-EDIT-99",
      gameName: "UpdatedIGN",
      level: 44,
      role: "Sniper",
      instagram: "https://instagram.com/editor99",
    });
  });

  it("prevents updating a profile to a duplicate username", async () => {
    const firstUser = await signUp({
      username: "alpha88",
      realName: "Alpha",
      email: "alpha@example.com",
      password: "secret88",
      contactNumber: "9444444441",
      game: "Free Fire Max",
      gameUid: "FF-ALPHA",
      gameName: "AlphaFF",
      level: 20,
      role: "IGL",
      avatar: "",
    });
    const secondUser = await signUp({
      username: "bravo88",
      realName: "Bravo",
      email: "bravo@example.com",
      password: "secret88",
      contactNumber: "9444444442",
      game: "BGMI",
      gameUid: "BG-BRAVO",
      gameName: "BravoBGMI",
      level: 21,
      role: "Support",
      avatar: "",
    });

    expect(firstUser.user).toBeTruthy();
    expect(secondUser.user).toBeTruthy();

    const result = await updateProfile(secondUser.user!.id, {
      username: "alpha88",
    });

    expect(result).toEqual({
      success: false,
      error: "Username already taken",
    });
  });
});
