# Staff Roles and Permissions

This document defines the active staff roles stored in `staff_users.role`. The application accepts exactly three active roles.

## Active Roles

- `super_admin` — System Administrator with full access to every existing Admin dashboard section, including membership applications, service requests, service catalogs, organizational content, news management, staff management, and audit logs. Super Admins have full control over the News workflow.
- `news_editor` — Writer who can create articles, edit their own eligible articles, and submit or resubmit them for review.
- `news_reviewer` — Reviewer who can access only other authors' articles with `pending_review` status, request revisions, and publish eligible articles. Reviewers cannot create articles, edit articles, upload article media, or review their own articles.

## Permission Boundaries

| Feature | Roles |
|---|---|
| Membership applications and export | `super_admin` |
| Service requests and catalogs | `super_admin` |
| Organizational content | `super_admin` |
| News article creation and editing | `super_admin`, `news_editor` |
| News media upload | `super_admin` |
| Submit or resubmit articles for review | `news_editor` |
| Read own articles | `news_editor` |
| Read all articles | `super_admin` |
| Read other authors' pending review articles | `news_reviewer` |
| Review and publish other authors' pending review articles | `super_admin`, `news_reviewer` |
| Direct review of own `draft` and `changes_requested` articles | `super_admin` |
| Request changes with a review note | `super_admin`, `news_reviewer`, subject to their permitted article scope |
| Unpublish articles | `super_admin` |
| Staff management and audit logs | `super_admin` |
| Account page | All three active roles |

## News Workflow Rules

### Writer (`news_editor`)

- Can create new articles. Newly created articles start with `draft` status.
- Can read only their own articles.
- Can edit only their own articles with `draft` or `changes_requested` status.
- Can submit eligible `draft` articles for review.
- Can edit and resubmit their own `changes_requested` articles after addressing the review notes.
- Submitting or resubmitting an article changes its status to `pending_review`.
- Cannot publish articles, request changes, review articles, or edit submitted or published articles.
- Cannot access or modify another author's articles through direct API requests.

### Reviewer (`news_reviewer`)

- Can read only articles authored by other users with `pending_review` status.
- Cannot access drafts, published articles, `changes_requested` articles, or their own articles.
- Cannot bypass these restrictions through query parameters or direct API requests.
- Can publish eligible articles authored by other users.
- Can request changes on eligible articles, provided a non-empty review note is supplied.
- Requesting changes changes the article status to `changes_requested` and stores the review note for the Writer.
- After an article is returned for changes, it is no longer visible in the Reviewer's pending review queue.
- Cannot create articles, edit articles, upload article media, or review their own articles.

### Super Admin (`super_admin`)

- Can read, create, edit, and manage all articles.
- Can review their own articles directly when their status is `draft` or `changes_requested`.
- Can publish their own eligible articles directly without submitting them to the Reviewer queue.
- Can request changes on their own eligible articles with a review note.
- Can review, publish, and request changes on other authors' eligible articles.
- Can unpublish articles.
- Is not required to follow the Writer submission workflow for their own articles.

## Article Statuses and Workflow

The application uses the existing article statuses. No additional statuses are introduced.

| Current Status | Action | Result |
|---|---|---|
| New article | Created by Writer or Super Admin | `draft` |
| Writer's own `draft` | Submit for review | `pending_review` |
| Writer's own `changes_requested` | Edit and resubmit | `pending_review` |
| Other author's `pending_review` | Reviewer publishes | `published` |
| Other author's `pending_review` | Reviewer requests changes with a note | `changes_requested` |
| Super Admin's own `draft` | Direct publish | `published` |
| Super Admin's own `draft` | Direct request changes with a note | `changes_requested` |
| Super Admin's own `changes_requested` | Direct publish | `published` |
| Super Admin's own `changes_requested` | Update review note / request changes | `changes_requested` |
| Other author's eligible article | Super Admin publishes or requests changes | `published` or `changes_requested` |
| Published article | Super Admin unpublishes | `draft` |

Invalid transitions and unauthorized actions must be rejected by the service layer.

## Enforcement Requirements

- All role permissions must be enforced on the backend/service layer, not only by hiding or showing UI actions.
- Direct API requests must follow the same authorization and ownership restrictions as the Admin dashboard.
- Unauthorized article reads should use the existing not-found behavior where applicable, without revealing whether restricted articles exist.
- UI actions must reflect the permissions and eligible article statuses enforced by the backend.
- Desktop and mobile News actions must remain consistent.
- Review notes must be stored and accessible to the article's Writer after a changes request.
- Role-specific Super Admin review decisions must not weaken Reviewer restrictions.
- No database schema or article status changes are required to implement these permissions.

## Role Management

Only the following three roles are valid:

- `super_admin`
- `news_editor`
- `news_reviewer`

Removed or deprecated roles must not be reintroduced into active role choices, authorization checks, or staff management interfaces.