-- The unique constraint made the audit trail incapable of holding repeat
-- history: the second time an actor performed the same action on the same
-- entity, `createAuditLog`'s `.create` threw. Where the insert was awaited
-- (admin/customers/$id.ts) that surfaced as a 500 and the ban was never
-- applied; where it was fire-and-forget the entry was silently lost.
DROP INDEX IF EXISTS "audit_log_actorId_action_entity_entityId_key";

-- Reading an entity's history is the access pattern that matters, so index it
-- with the timestamp rather than the actor.
CREATE INDEX "audit_log_entity_entityId_createdAt_idx" ON "audit_log"("entity", "entityId", "createdAt");