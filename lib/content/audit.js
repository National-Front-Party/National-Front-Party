export function contentAuditBase(actor, target, details = {}) {
  return {
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_email: actor.email,
    actor_staff_user_id: actor.id,
    target_id: String(target.id),
    target_name: target.name ?? target.title ?? target.slug ?? String(target.id),
    target_email: null,
    target_staff_user_id: null,
    details,
  };
}

export async function writeContentAudit(tx, actor, target, actionType, details = {}) {
  await tx.staff_audit_log.create({
    data: {
      ...contentAuditBase(actor, target, details),
      action_type: actionType,
    },
  });
}
