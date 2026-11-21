# Staff Roles and Permissions

This document defines the active staff roles stored in `staff_users.role`. The application accepts exactly three roles.

## Active roles

- `super_admin` - System Administrator with full access to every existing Admin dashboard section: membership applications, service requests, service catalogs, organizational content, news management, staff management, and audit logs.
- `news_editor` - Writer with the existing News permissions to create and edit their own articles and submit them for review.
- `news_reviewer` - Reviewer with the existing News permissions to read all articles, review other authors' articles, request revisions, and publish or unpublish them. Reviewers cannot create, edit, or upload article media.

## Permission boundaries

| Feature | Roles |
|---|---|
| Membership applications and export | `super_admin` |
| Service requests and catalogs | `super_admin` |
| Organizational content | `super_admin` |
| News writing and media upload | `super_admin`, `news_editor` |
| Submit articles for review | `super_admin`, `news_editor` |
| Read own articles | `news_editor` |
| Read all articles and review/publish other authors' articles | `super_admin`, `news_reviewer` |
| Staff management and audit logs | `super_admin` |
| Account page | All three active roles |

Article statuses and valid workflow transitions remain unchanged. Writers cannot edit submitted or published articles; Reviewers cannot review their own articles; System Administrators may complete the full workflow on their own articles.
