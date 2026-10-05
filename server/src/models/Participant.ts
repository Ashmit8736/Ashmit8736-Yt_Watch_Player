import { Role } from '../constants/roles';

export interface DBParticipant {
  id: string;
  username: string;
  role: Role;
  roomId: string;
}

export class Participant {
  public id: string;
  public username: string;
  public role: Role;
  public roomId: string;

  constructor(id: string, username: string, role: Role, roomId: string) {
    this.id = id;
    this.username = username;
    this.role = role;
    this.roomId = roomId;
  }

  public static from(row: DBParticipant): Participant {
    return new Participant(row.id, row.username, row.role, row.roomId);
  }

  public isHost(): boolean {
    return this.role === Role.HOST;
  }

  public isModerator(): boolean {
    return this.role === Role.MODERATOR;
  }

  public canControlPlayback(): boolean {
    return this.role === Role.HOST || this.role === Role.MODERATOR;
  }

  public canManageRoles(): boolean {
    return this.role === Role.HOST;
  }

  public setRole(role: Role): void {
    this.role = role;
  }

  public toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
      roomId: this.roomId
    };
  }
}
