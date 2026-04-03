import { Injectable } from '@nestjs/common';

export type UserRecord = {
  id: string;
  email: string;
  shariahMode: boolean;
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class UsersService {
  private readonly byEmail = new Map<string, UserRecord>();
  private readonly byId = new Map<string, UserRecord>();

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  getOrCreateByEmail(email: string) {
    const k = this.key(email);
    const found = this.byEmail.get(k);
    if (found) return found;
    const now = Date.now();
    const u: UserRecord = {
      id: crypto.randomUUID(),
      email: k,
      shariahMode: false,
      createdAt: now,
      updatedAt: now,
    };
    this.byEmail.set(k, u);
    this.byId.set(u.id, u);
    return u;
  }

  getById(id: string) {
    return this.byId.get(id) || null;
  }

  setShariahMode(id: string, value: boolean) {
    const u = this.byId.get(id);
    if (!u) return null;
    u.shariahMode = value;
    u.updatedAt = Date.now();
    this.byId.set(id, u);
    this.byEmail.set(u.email, u);
    return u;
  }
}
