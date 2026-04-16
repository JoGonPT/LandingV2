import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parsePartnerPricingModel, type PartnerPricingModel } from "@/lib/partner/commission-pricing";
import type { PartnerCreditAccount, PartnerCreditStore } from "@/lib/partner/credit/types";

type AccountRow = {
  displayName: string;
  creditLimit: number;
  currentUsage: number;
  commissionRate?: number;
  pricingModel?: string;
  totalCommissionsEarned?: number;
};

type FileShape = {
  version: 1;
  accounts: Record<string, AccountRow>;
};

let memoryLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = memoryLock.then(fn);
  memoryLock = next.then(() => undefined, () => undefined);
  return next;
}

function toAccount(slug: string, row: AccountRow): PartnerCreditAccount {
  return {
    slug,
    displayName: row.displayName,
    creditLimit: row.creditLimit,
    currentUsage: row.currentUsage,
    commissionRate: row.commissionRate ?? 0,
    pricingModel: parsePartnerPricingModel(row.pricingModel),
    totalCommissionsEarned: row.totalCommissionsEarned ?? 0,
  };
}

export class FilePartnerCreditStore implements PartnerCreditStore {
  constructor(private readonly filePath: string) {}

  private async read(): Promise<FileShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const data = JSON.parse(raw) as FileShape;
      if (data.version !== 1 || !data.accounts || typeof data.accounts !== "object") {
        return { version: 1, accounts: {} };
      }
      return data;
    } catch {
      return { version: 1, accounts: {} };
    }
  }

  private async write(data: FileShape): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }

  async getAccount(slug: string): Promise<PartnerCreditAccount | null> {
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) return null;
      return toAccount(slug, row);
    });
  }

  async ensureAccount(slug: string, displayName: string, defaultLimit: number): Promise<PartnerCreditAccount> {
    return withLock(async () => {
      const data = await this.read();
      if (!data.accounts[slug]) {
        data.accounts[slug] = {
          displayName,
          creditLimit: defaultLimit,
          currentUsage: 0,
          commissionRate: 0,
          pricingModel: "MARKUP",
          totalCommissionsEarned: 0,
        };
        await this.write(data);
      } else {
        const row = data.accounts[slug];
        let changed = false;
        if (row.displayName !== displayName) {
          row.displayName = displayName;
          changed = true;
        }
        if (row.commissionRate === undefined) {
          row.commissionRate = 0;
          changed = true;
        }
        if (row.pricingModel === undefined) {
          row.pricingModel = "MARKUP";
          changed = true;
        }
        if (row.totalCommissionsEarned === undefined) {
          row.totalCommissionsEarned = 0;
          changed = true;
        }
        if (changed) await this.write(data);
      }
      return toAccount(slug, data.accounts[slug]);
    });
  }

  async setCreditLimit(slug: string, limit: number): Promise<PartnerCreditAccount> {
    return this.updatePartnerTerms(slug, { creditLimit: limit });
  }

  async updatePartnerTerms(
    slug: string,
    patch: { creditLimit?: number; commissionRate?: number; pricingModel?: PartnerPricingModel },
  ): Promise<PartnerCreditAccount> {
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) throw new Error(`Partner ${slug} not found in credit store.`);
      if (patch.creditLimit !== undefined) row.creditLimit = Math.max(0, patch.creditLimit);
      if (patch.commissionRate !== undefined) {
        row.commissionRate = Math.max(0, Math.min(100, patch.commissionRate));
      }
      if (patch.pricingModel !== undefined) row.pricingModel = patch.pricingModel;
      await this.write(data);
      return toAccount(slug, row);
    });
  }

  async resetUsage(slug: string): Promise<PartnerCreditAccount> {
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) throw new Error(`Partner ${slug} not found in credit store.`);
      row.currentUsage = 0;
      await this.write(data);
      return toAccount(slug, row);
    });
  }

  async incrementCommissionsEarned(slug: string, delta: number): Promise<PartnerCreditAccount> {
    if (!Number.isFinite(delta) || delta <= 0) {
      const a = await this.getAccount(slug);
      if (!a) throw new Error(`Partner ${slug} not found.`);
      return a;
    }
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) throw new Error(`Partner ${slug} not found in credit store.`);
      row.totalCommissionsEarned = (row.totalCommissionsEarned ?? 0) + delta;
      await this.write(data);
      return toAccount(slug, row);
    });
  }

  async releaseCredit(slug: string, amount: number): Promise<PartnerCreditAccount> {
    if (!Number.isFinite(amount) || amount <= 0) {
      const a = await this.getAccount(slug);
      if (!a) throw new Error(`Partner ${slug} not found.`);
      return a;
    }
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) throw new Error(`Partner ${slug} not found in credit store.`);
      row.currentUsage = Math.max(0, row.currentUsage - amount);
      await this.write(data);
      return toAccount(slug, row);
    });
  }

  async tryConsumeCredit(
    slug: string,
    amount: number,
  ): Promise<
    { ok: true; account: PartnerCreditAccount } | { ok: false; available: number; limit: number; usage: number }
  > {
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, available: 0, limit: 0, usage: 0 };
    }
    return withLock(async () => {
      const data = await this.read();
      const row = data.accounts[slug];
      if (!row) return { ok: false, available: 0, limit: 0, usage: 0 };
      const available = row.creditLimit - row.currentUsage;
      if (amount > available) {
        return { ok: false, available, limit: row.creditLimit, usage: row.currentUsage };
      }
      row.currentUsage += amount;
      await this.write(data);
      return { ok: true, account: toAccount(slug, row) };
    });
  }
}
