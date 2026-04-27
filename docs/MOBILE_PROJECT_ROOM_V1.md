# Mobile Project Room V1

## Scope

The native project room gives contract participants a mobile-first review loop before onchain milestone delivery. It is intentionally a client over the existing escrow/project-room API rather than a separate mobile workflow.

Implemented route:

- `apps/mobile/src/app/contracts/[id]/room.tsx`

Entry point:

- `apps/mobile/src/app/contracts/[id].tsx` exposes `Open project room` from contract detail.

Shared contract:

- `packages/product-core/src/api/types.ts` defines mobile-safe project-room DTOs.
- `packages/product-core/src/api/client.ts` exposes the same authenticated API operations used by web.

## Role Model

The backend remains the source of authorization. Mobile derives UI affordances from `participantRoles`, the selected milestone status, and the latest submission state:

- Worker can post a milestone submission only while the selected milestone is `pending` and there is no latest submission or the latest submission is `revision_requested`.
- Client can request a revision or approve a submission while the selected milestone is `pending` and the latest submission is `submitted` or `revision_requested`.
- Worker can deliver an approved submission onchain while the selected milestone is `pending` and the latest submission is `approved`.
- Release and dispute remain on contract detail for now because they act on the onchain-delivered milestone state (`delivered`) rather than on the off-chain review state.

## API Mapping

Mobile calls these authenticated endpoints through `@escrow4334/product-core`:

- `GET /jobs/:jobId/project-room`
  - Loads the participant-scoped room, job, submissions, messages, activity, and support-case summaries.
- `POST /jobs/:jobId/project-room/messages`
  - Posts participant room messages with `{ body }`.
- `POST /jobs/:jobId/project-room/milestones/:milestoneIndex/submissions`
  - Posts worker submissions with `{ note, artifacts }`.
- `POST /jobs/:jobId/project-room/submissions/:submissionId/revision-request`
  - Posts client revision requests with `{ note }`.
- `POST /jobs/:jobId/project-room/submissions/:submissionId/approve`
  - Posts client approval with optional `{ note }`.
- `POST /jobs/:jobId/project-room/submissions/:submissionId/deliver`
  - Lets the worker deliver the approved submission onchain. The backend copies approved artifact URLs into milestone delivery evidence.

After every mutation, mobile invalidates both `['project-room', jobId]` and `['jobs']` so room state and contract detail state converge.

## Artifact Input

Mobile uses a text-first artifact capture that matches the current web workflow and keeps native implementation small without inventing storage:

```text
label | url | sha256 | mimeType | byteSize
```

Rules:

- `label`, `url`, and `sha256` are required per artifact line.
- `mimeType` is optional and becomes `null` when omitted.
- `byteSize` is optional and must be a non-negative integer when supplied.
- A submission can include at most 10 artifacts, matching backend validation.
- Artifacts are `external_url` metadata only; mobile does not upload files in this slice.

## UI Behavior

The route is built from existing mobile primitives:

- `SectionHeader` for room context.
- `SurfaceCard` blocks for summary, milestone review, submission, latest submission, client review, approved delivery, messages, and activity.
- `SegmentedControl` for milestone selection.
- `StatusBadge`, `MetricRow`, and `HashText` for compact review metadata.
- `PrimaryButton` and `SecondaryButton` for direct role actions.

The screen avoids nested cards. Repeated records are rendered as lightweight rows inside a single card to keep small-phone layout stable.

## Current Gaps

- Native support-case creation/reply is still web/admin-led. Mobile shows open support-case count from the room payload only.
- Native job-review capture is not implemented yet.
- Artifact upload/storage is not implemented; mobile records external artifact metadata only.
- Device-level wallet round trip for approved-submission delivery still needs real wallet testing after the Reown/AppKit hardening pass.
