/**
 * Repository layer — domain-scoped Supabase query abstractions.
 *
 * Each repository is a factory function that accepts a SupabaseClient
 * (browser or server) and returns typed, named query methods.
 *
 * Usage:
 *   import { createEventsRepository } from '@/lib/repositories';
 *   import { createClient } from '@/utils/supabase/client';
 *
 *   const eventsRepo = createEventsRepository(createClient());
 *   const { data, error } = await eventsRepo.findByAccountId(accountId);
 */

export { createUsersRepository } from './users.repository';
export { createAccountsRepository } from './accounts.repository';
export { createEventsRepository } from './events.repository';
export { createTicketsRepository } from './tickets.repository';
export { createFinanceRepository } from './finance.repository';
export { createAdsRepository } from './ads.repository';
export { createForumRepository } from './forum.repository';
export { createNotificationsRepository } from './notifications.repository';
export { createReferenceRepository } from './reference.repository';

export type { DbClient, RepoResult, RepoListResult, RepoError, ListOptions } from './types';
export { isNotFound, isPermissionDenied, isUniqueViolation } from './types';
