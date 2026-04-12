import type {
  MarketplaceApplicationRecord,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
} from '../../modules/marketplace/marketplace.types';
import type { MarketplaceRepository } from '../persistence.types';
import { FilePersistenceStore } from './file-persistence.store';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function normalizeProfile(
  profile: MarketplaceProfileRecord,
): MarketplaceProfileRecord {
  return {
    ...profile,
    slug: profile.slug.trim().toLowerCase(),
    skills: Array.from(new Set(profile.skills.map((skill) => skill.trim()))).filter(Boolean),
    portfolioUrls: Array.from(
      new Set(profile.portfolioUrls.map((url) => url.trim())),
    ).filter(Boolean),
  };
}

function normalizeOpportunity(
  opportunity: MarketplaceOpportunityRecord,
): MarketplaceOpportunityRecord {
  return {
    ...opportunity,
    category: opportunity.category.trim().toLowerCase(),
    requiredSkills: Array.from(
      new Set(opportunity.requiredSkills.map((skill) => skill.trim())),
    ).filter(Boolean),
  };
}

function normalizeApplication(
  application: MarketplaceApplicationRecord,
): MarketplaceApplicationRecord {
  return {
    ...application,
    portfolioUrls: Array.from(
      new Set(application.portfolioUrls.map((url) => url.trim())),
    ).filter(Boolean),
  };
}

export class FileMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async getProfileByUserId(userId: string) {
    return this.store.read((data) => {
      const profile = data.marketplaceProfiles[userId];
      return profile ? cloneValue(normalizeProfile(profile)) : null;
    });
  }

  async getProfileBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    return this.store.read((data) => {
      const profile = Object.values(data.marketplaceProfiles).find(
        (candidate) => candidate.slug === normalizedSlug,
      );
      return profile ? cloneValue(normalizeProfile(profile)) : null;
    });
  }

  async listProfiles() {
    return this.store.read((data) =>
      Object.values(data.marketplaceProfiles)
        .map((profile) => cloneValue(normalizeProfile(profile)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveProfile(profile: MarketplaceProfileRecord) {
    await this.store.write((data) => {
      data.marketplaceProfiles[profile.userId] = cloneValue(
        normalizeProfile(profile),
      );
    });
  }

  async getOpportunityById(opportunityId: string) {
    return this.store.read((data) => {
      const opportunity = data.marketplaceOpportunities[opportunityId];
      return opportunity ? cloneValue(normalizeOpportunity(opportunity)) : null;
    });
  }

  async listOpportunities() {
    return this.store.read((data) =>
      Object.values(data.marketplaceOpportunities)
        .map((opportunity) => cloneValue(normalizeOpportunity(opportunity)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveOpportunity(opportunity: MarketplaceOpportunityRecord) {
    await this.store.write((data) => {
      data.marketplaceOpportunities[opportunity.id] = cloneValue(
        normalizeOpportunity(opportunity),
      );
    });
  }

  async getApplicationById(applicationId: string) {
    return this.store.read((data) => {
      const application = data.marketplaceApplications[applicationId];
      return application ? cloneValue(normalizeApplication(application)) : null;
    });
  }

  async listApplications() {
    return this.store.read((data) =>
      Object.values(data.marketplaceApplications)
        .map((application) => cloneValue(normalizeApplication(application)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveApplication(application: MarketplaceApplicationRecord) {
    await this.store.write((data) => {
      data.marketplaceApplications[application.id] = cloneValue(
        normalizeApplication(application),
      );
    });
  }
}
