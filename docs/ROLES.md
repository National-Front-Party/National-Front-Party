# Staff Roles and Permissions

This document defines the active staff roles stored in `staff_users.role`. The application accepts exactly three roles.

## Active roles

- `super_admin` - System Administrator with full access to every existing Admin dashboard section: membership applications, service requests, service catalogs, organizational content, news management, staff management, and audit logs.
- `news_editor` - Writer with the existing News permissions to create and edit their own articles and submit them for review.
- `news_reviewer` - Reviewer with the existing News permissions to read all articles, review them, request revisions, and publish or unpublish them.

## Permission boundaries

| Feature | Roles |
|---|---|
| Membership applications and export | `super_admin` |
| Service requests and catalogs | `super_admin` |
| Organizational content | `super_admin` |
| News writing | `super_admin`, `news_editor`, `news_reviewer` |
| Submit articles for review | `super_admin`, `news_editor` |
| Read own articles | `news_editor` |
| Read all articles and review/publish | `super_admin`, `news_reviewer` |
| Staff management and audit logs | `super_admin` |
| Account page | All three active roles |

News permissions and article workflow rules are unchanged by this role consolidation.
