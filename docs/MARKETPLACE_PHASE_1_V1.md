# Marketplace Phase 1 V1

## Status

- Version: `v1`
- Phase: `1`
- Title: Marketplace Identity, Workspaces, and Roles
- Depends on: Phase 0
- Repo status: repo-side Phase 1 coding is now in place for client, freelancer, and agency identity/workspace flows

## Objective

- Replace the current single-user and single-flow bias with a true marketplace identity and workspace model.

## In Scope

- client organizations
- organization membership
- explicit freelancer identity
- explicit agency identity
- capability-based RBAC
- workspace-aware dashboards and routing
- role-aware onboarding and checklist logic

## Not In Scope

- advanced search/ranking
- full review/reputation system
- hourly or multi-worker contract models

## Existing Repo Assets To Reuse

- OTP + SIWE + wallet linking and smart-account provisioning
- current marketplace workspace surfaces
- existing operator authentication and wallet-bound dispute authority model
- persisted user/session/wallet repository pattern

## Domain Additions

- `Organization`
- `OrganizationMember`
- `OrganizationRole`
- `Agency`
- `AgencySeat`
- optional `UserVerification` groundwork if needed for identity confidence later

## Capability Model

- `client_owner`
- `client_recruiter`
- `agency_owner`
- `agency_member`
- `freelancer`
- `operator`
- `moderator`

## Implementation Guidance

## Backend

- Add organization and membership modules instead of scattering role logic across marketplace and escrow services.
- Keep wallet authority separate from membership authority:
  - workspace permissions are off-chain and role-based
  - escrow execution authority remains bound to verified wallet/smart-account state
- Introduce one capability resolver that can be reused by API controllers and frontend session payloads.
- Normalize ownership on existing marketplace entities so public profile ownership is not tied too directly to a single auth user row.
- Add APIs for:
  - organization creation
  - membership invitation/acceptance
  - workspace selection
  - capability introspection

## Data and Migrations

- Add normalized tables for organizations and memberships.
- Add normalized invitation persistence so shared workspaces can be granted and accepted without overloading session state.
- Add organization/workspace foreign keys to opportunities and future client-owned artifacts.
- Add profile ownership abstraction so a talent or agency profile can survive role/member changes cleanly.
- Preserve migration compatibility with the current single-user records by backfilling default personal workspaces where needed.

## Frontend

- Add an onboarding branch that clearly asks whether the user wants to:
  - hire
  - freelance
  - run an agency
- Split the current marketplace workspace into explicit client and talent dashboards.
- Add a workspace switcher with the active role/workspace always visible.
- Add role-aware navigation rather than relying on one marketplace surface with conditionally hidden panels.
- Keep wallet setup and smart-account readiness in the checklist, but place it after the user has chosen the right marketplace identity.

## Current Repo Implementation

- API:
  - organizations, memberships, invitations, and workspaces persist through both file-backed and Postgres adapters
  - personal client/freelancer workspaces are backfilled for existing users
  - client and agency organizations both support owner/member invitation flows
  - invitation acceptance activates the correct client or talent workspace
- Web:
  - the authenticated marketplace workspace now exposes explicit `client`, `freelancer`, and `agency` lanes
  - the active workspace header and switcher always show the current mode
  - organization creation is kind-aware (`client` or `agency`)
  - agency workspaces reuse the talent/freelancer workspace kind while remaining distinct via `organizationKind === 'agency'`
  - personal workspaces can create organizations but do not behave like shared invite-managed organizations

## Admin/Operator

- Move moderator/operator capabilities onto the same explicit capability model instead of letting privileged screens infer access from narrow current flows.
- Preserve the current arbitrator wallet requirement for final dispute actions until a broader operator model is intentionally added.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- The most important UX rule in this phase is identity clarity:
  - the user must always know which workspace they are acting in
  - the user must always know whether they are acting as client, freelancer, agency member, or operator
- Do not bury workspace context in small settings pages.
- Use persistent page-level context chips or headers for active workspace/role.
- Permission denials should explain the missing role or membership, not just hide actions.

## Exit Criteria

- A new user can choose hire/freelance/agency and land in the right workspace.
- Organizations and memberships are persisted and queryable through a normalized API surface.
- Opportunities and future client-side marketplace actions can be owned by organizations instead of one auth user.
- Privileged admin/moderation actions use a clearer capability baseline.
- Repo-side status: these criteria are now satisfied in code and repo docs; broader release proof still follows the separate Phase 0 staging/release path.

## Verification

- API unit/integration tests for organization, membership, and capability resolution
- web route tests for onboarding branch and workspace switching
- admin route tests for explicit capability gating
- one browser journey proving:
  - choose role
  - set up workspace
  - reach the correct dashboard

## Handoff To Phase 2

- Once identity and workspace ownership are stable, search and recommendation systems can target the correct supply-side and demand-side surfaces.
