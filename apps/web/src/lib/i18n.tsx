'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  defaultLocale,
  getLocaleDefinition,
  persistLocaleCookie,
  resolveSupportedLocale,
  syncDocumentLocale,
  type LocaleContextValue,
  type SupportedLocale,
} from '@escrow4334/frontend-core';

const webMessages = {
  en: {
    languageName: 'English',
    languageNativeName: 'English',
    common: {
      brand: 'Milestone Escrow',
      productSurface: 'Client product',
      productConsole: 'Client Console',
      operatorConsole: 'Operator Console',
      currentLanguage: 'Language',
      home: 'Home',
      marketplace: 'Marketplace',
      trust: 'Trust',
      signIn: 'Sign in',
      startEscrow: 'Start a milestone escrow',
      startContract: 'Start a contract',
      loading: 'Loading',
      unavailable: 'Unavailable',
      unknown: 'Unknown',
      authenticated: 'Authenticated',
      signedOut: 'Signed out',
      enabled: 'Enabled',
      disabled: 'Disabled',
      notSet: 'Not set',
      noneConfigured: 'None configured',
      noReceiptYet: 'No receipt yet',
      noDueDate: 'No due date',
      notFunded: 'Not funded',
      pending: 'Pending',
      legacy: 'Legacy',
      observer: 'Observer',
      joined: 'Joined',
      walletVerified: 'Wallet verified',
      setupRequired: 'Setup required',
      shareLinkReady: 'Share link ready',
      readyToJoin: 'Ready to join',
      yes: 'Yes',
      no: 'No',
      profile: 'Profile',
      runtime: 'Runtime',
      ready: 'Ready',
      days: (count: number) => `${count} day${count === 1 ? '' : 's'}`,
      milestoneNumber: (index: number, title: string) => `${index}. ${title}`,
      dueAt: (value: string) => `Due ${value}`,
    },
    marketing: {
      heroEyebrow: 'Agency and client service work on Base',
      heroTitle: 'Milestone escrow for crypto service work',
      heroLead:
        'Lock client funds upfront, release by milestone, and resolve disputes with a clear audit trail on Base. This launch candidate is built for one flow: client funds, contractor delivers, client releases or disputes, operator resolves.',
      trustCta: 'See the trust model',
      stats: [
        {
          title: 'Email-first onboarding',
          body: 'OTP sign-in plus wallet linking keeps setup lighter than raw wallet-only flows.',
        },
        {
          title: 'Milestone release and dispute flow',
          body: 'Funding, delivery, release, dispute, and operator resolution are already implemented in the repo.',
        },
        {
          title: 'Operator-visible case history',
          body: 'Each contract exposes an audit bundle, execution receipts, and exportable case artifacts.',
        },
      ],
      howItWorksTitle: 'How it works',
      steps: [
        {
          title: 'Create and fund',
          body: 'The client creates a milestone contract, binds the contractor wallet, and funds the escrow.',
        },
        {
          title: 'Deliver and review',
          body: 'The contractor joins through the shared link, signs in, links the exact wallet, and submits delivery evidence.',
        },
        {
          title: 'Release or dispute',
          body: 'The client releases the milestone or opens a dispute. The operator resolves from the visible case history.',
        },
      ],
      productBoundsTitle: 'What this launch candidate is and is not',
      bounds: [
        {
          title: 'It is a focused agency or client escrow flow.',
          body: 'One client, one contractor, one operator, one chain, one milestone-based service contract model.',
        },
        {
          title: 'It is an escrow-first marketplace, not an embedded platform.',
          body: 'Curated talent discovery and brief hiring now exist, but the close still routes into one client-to-one contractor escrow flow on one chain.',
        },
        {
          title: 'Trust claims stay narrow.',
          body: 'The product shows what is implemented now and what still needs live staged proof before it should be called production-proven.',
        },
      ],
      trustPage: {
        escrowTitle: 'How escrow works here',
        escrowIntro:
          'Funds are locked to one milestone-based service contract instead of sent as an informal upfront payment. The contractor wallet is bound at contract creation, and only that wallet can act as the contractor in the workflow.',
        escrowList: [
          'The client funds the job before milestone delivery starts.',
          'The contractor delivers against the funded milestone with a delivery note and evidence URLs.',
          'The client releases the milestone or opens a dispute with a reason and evidence URLs.',
        ],
        disputesTitle: 'How disputes work',
        disputesIntro:
          'Disputes stay milestone-scoped. The operator does not act as a hidden admin; the current product model uses the configured arbitrator wallet as the designated dispute resolver.',
        disputesList: [
          'The operator sees the milestone posture, delivery note, delivery evidence, dispute reason, dispute evidence, audit events, and receipts.',
          'The operator records a release or refund decision plus a resolution note.',
          'The case remains exportable as job-history and dispute-case artifacts.',
        ],
        implementedTitle: 'What is implemented today',
        proofCards: [
          {
            title: 'Implemented in-repo',
            body: 'OTP auth, wallet linking, smart-account provisioning, client funding, contractor delivery, client dispute, operator resolution, audit bundle lookup, and export artifacts.',
          },
          {
            title: 'Visible in the product',
            body: 'The shared contract link, role-specific action states, milestone evidence, dispute evidence, operator case review, and runtime readiness posture.',
          },
          {
            title: 'Still being validated live',
            body: 'Real staged launch-candidate evidence, live relay exercise, live alert delivery, and other deployed-environment proof still need to be run outside the repo.',
          },
        ],
      },
    },
    publicMarketplace: {
      navWorkspace: 'Marketplace workspace',
      openWorkspace: 'Open workspace',
      directContractPath: 'Direct contract path',
      heroEyebrow: 'Escrow-first marketplace',
      heroTitle: 'Hire through curated briefs and convert the winner into escrow.',
      heroLead:
        'Browse verified talent, publish private or public briefs, and move the selected application straight into the existing milestone escrow flow.',
      loadFailure: 'Unable to load the marketplace feed right now.',
      stats: {
        visibleTalentTitle: (count: number) =>
          `${count} visible talent profile${count === 1 ? '' : 's'}`,
        visibleTalentBody:
          'Profiles only appear after they are complete and moderation-visible.',
        openBriefsTitle: (count: number) =>
          `${count} open brief${count === 1 ? '' : 's'}`,
        openBriefsBody:
          'Public briefs are browseable; private briefs are still direct-linkable.',
        escrowCloseTitle: 'One hire closes into one escrow contract',
        escrowCloseBody:
          'The marketplace is a sourcing layer, not a separate settlement path.',
      },
      featuredTalentTitle: 'Featured talent',
      noProfilesTitle: 'No public talent profiles yet',
      noProfilesBody:
        'Profiles appear here after contractors complete them in the marketplace workspace.',
      openOpportunitiesTitle: 'Open opportunities',
      noOpportunitiesTitle: 'No public briefs yet',
      noOpportunitiesBody:
        'Clients can publish briefs from the authenticated marketplace workspace.',
      expansionTitle: 'How this expands the product',
      expansionCards: [
        {
          title: 'Discovery before contract creation',
          body: 'Clients can now source talent through profiles, public briefs, and applications before they create escrow.',
        },
        {
          title: 'Still escrow-first',
          body: 'The selected application closes into the same milestone escrow workflow, dispute flow, and operator review path.',
        },
        {
          title: 'Useful without becoming spammy',
          body: 'This is curated-brief matching, not an open bid wall, so it stays closer to startup hiring and closer to the current trust model.',
        },
      ],
      actions: {
        viewProfile: 'View profile',
        viewBrief: 'View brief',
        backToMarketplace: 'Back to marketplace',
        applyFromWorkspace: 'Apply from workspace',
      },
      labels: {
        verifiedWallet: 'verified wallet',
        visibility: {
          public: 'Public brief',
          private: 'Private brief',
        },
        verificationLevel: {
          wallet_verified: 'Wallet verified',
          wallet_and_escrow_history: 'Wallet + escrow history',
          wallet_escrow_and_delivery: 'Wallet + escrow + delivery history',
        },
        cryptoReadiness: {
          wallet_only: 'Wallet only',
          smart_account_ready: 'Smart account ready',
          escrow_power_user: 'Escrow power user',
        },
        engagementType: {
          fixed_scope: 'Fixed scope',
          milestone_retainer: 'Milestone retainer',
          advisory: 'Advisory',
        },
        escrowReadiness: {
          ready: 'Ready',
          wallet_required: 'Wallet required',
          smart_account_required: 'Smart account required',
        },
        averageContractValueBand: {
          small: 'Small',
          medium: 'Medium',
          large: 'Large',
          unknown: 'Unknown',
        },
        proofArtifactKind: {
          portfolio: 'Portfolio',
          escrow_delivery: 'Escrow delivery',
          escrow_case: 'Escrow case',
          external_case_study: 'External case study',
        },
      },
      profileDetail: {
        topBarLabel: 'Marketplace profile',
        topBarMeta: 'Public contractor detail with escrow-derived trust signals.',
        unavailableTitle: 'Profile unavailable',
        unavailableBody: 'Unable to load this profile right now.',
        loadingTitle: 'Loading profile…',
        heroEyebrow: 'Talent profile',
        verification: 'Verification',
        cryptoReadiness: 'Crypto readiness',
        completedEscrowJobs: 'Completed escrow jobs',
        aboutEyebrow: 'About',
        credibilityTitle: 'Credibility summary',
        skills: 'Skills',
        specialties: 'Specialties',
        preferredEngagements: 'Preferred engagements',
        rateRange: 'Rate range',
        noneListed: 'None listed',
        notListed: 'Not listed',
        escrowSignalEyebrow: 'Escrow signal',
        executionTitle: 'Verified execution history',
        completionRate: 'Completion rate',
        disputeRate: 'Dispute rate',
        onTimeDelivery: 'On-time delivery',
        averageContractBand: 'Average contract band',
        completedByCategory: 'Completed by category',
        noEscrowHistory: 'No completed escrow history yet.',
        proofEyebrow: 'Proof',
        walletAndProofTitle: 'Wallet and proof artifacts',
        verifiedWallet: 'Verified wallet',
        noVerifiedWallet: 'No verified wallet published',
      },
      opportunityDetail: {
        topBarLabel: 'Marketplace opportunity',
        topBarMeta: 'Decision-ready brief detail before escrow conversion.',
        unavailableTitle: 'Opportunity unavailable',
        unavailableBody: 'Unable to load this brief right now.',
        loadingTitle: 'Loading brief…',
        client: 'Client',
        applications: 'Applications',
        escrowReadiness: 'Escrow readiness',
        briefEyebrowFallback: 'Brief',
        briefEyebrow: (visibilityLabel: string) => visibilityLabel,
        briefEyebrowSuffix: 'brief',
        scopeEyebrow: 'Brief',
        scopeTitle: 'Scope and outcomes',
        category: 'Category',
        timeline: 'Timeline',
        budget: 'Budget',
        settlementToken: 'Settlement token',
        desiredStart: 'Desired start',
        timezoneOverlap: 'Timezone overlap',
        notSpecified: 'Not specified',
        hours: (count: number) => `${count} hours`,
        hiringSpecEyebrow: 'Hiring spec',
        fitRequirementsTitle: 'Fit requirements',
        requiredSkills: 'Required skills',
        mustHaveSkills: 'Must-have skills',
        engagementType: 'Engagement type',
        cryptoReadinessRequired: 'Crypto readiness required',
        outcomes: 'Outcomes',
        acceptanceCriteria: 'Acceptance criteria',
        screeningQuestions: 'Screening questions',
        noScreeningQuestions: 'No screening questions specified.',
      },
      reporting: {
        eyebrow: 'Trust and safety',
        title: 'Report this listing',
        intro:
          'Flag spam, scams, impersonation, or policy abuse for operator review.',
        reason: 'Reason',
        details: 'Details',
        evidenceUrls: 'Evidence URLs',
        detailsPlaceholder:
          'Describe what happened and why it should be reviewed.',
        evidencePlaceholder: 'Paste supporting URLs, one per line.',
        submit: 'Submit report',
        submitting: 'Submitting…',
        signInRequired:
          'Sign in from the app workspace before submitting a report.',
        otherReasonRequired:
          'Additional details are required for the "other" report reason.',
        submitted: (subjectLabel: string) => `Report submitted for ${subjectLabel}.`,
        failedSubmit: 'Failed to submit report.',
        reasons: {
          spam: 'Spam',
          scam: 'Scam',
          impersonation: 'Impersonation',
          harassment: 'Harassment',
          off_platform_payment: 'Off-platform payment',
          policy_violation: 'Policy violation',
          other: 'Other',
        },
      },
    },
    console: {
      topBarLabel: 'Bilingual product UI',
      topBarMeta:
        'Switch instantly between English and Arabic. Arabic uses full RTL layout and keeps technical values readable in LTR.',
      frames: {
        signIn: {
          eyebrow: 'Sign In',
          title: 'Start a milestone escrow session.',
          copy:
            'Use OTP sign-in first. The app will then restore your escrow access, linked wallets, and contract actions.',
        },
        setup: {
          eyebrow: 'Setup',
          title: 'Link the right wallet before money moves.',
          copy:
            'Clients need a provisioned smart account to create contracts. Contractors need the exact delivery wallet linked before they can join and deliver.',
        },
        newContract: {
          eyebrow: 'New Contract',
          title: 'Create one milestone-based service contract.',
          copy:
            'Bind the contractor wallet up front, define the milestones in plain language, and review the release and dispute model before funding.',
        },
        contract: {
          eyebrow: 'Contract',
          title: 'Review one contract with the exact actor rules.',
          copy:
            'This shared link can be opened by the client or contractor. Actions unlock only when the signed-in account controls the required wallet.',
        },
        deliver: {
          eyebrow: 'Deliver',
          title: 'Submit milestone delivery with explicit evidence.',
          copy:
            'The contractor joins through the shared contract link, signs in, links the bound wallet, and delivers against the funded milestone.',
        },
        dispute: {
          eyebrow: 'Dispute',
          title: 'Escalate one milestone with a clear evidence trail.',
          copy:
            'Disputes stay milestone-scoped. The client records the issue and supporting links, and the operator resolves from the visible audit trail.',
        },
        overview: {
          eyebrow: 'Client Console',
          title: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
          copy:
            'This surface is wired to the real API modules already in the repo: auth, SIWE wallet linking, smart-account provisioning, job creation, milestone actions, and public audit review.',
        },
      },
      runtime: {
        title: 'Backend profile validation',
        profile: 'Profile',
        providers: 'Providers',
        arbitratorWallet: 'Arbitrator wallet',
        frontendOrigin: 'Frontend origin',
        corsReadiness: 'CORS readiness',
        apiTransport: 'API transport',
        persistence: 'Persistence',
        trustProxy: 'Trust proxy',
        allowedOrigins: 'Allowed origins',
        backendProfile: 'Backend profile',
        apiBaseUrl: 'API base URL',
        session: 'Session',
        jobsInView: 'Jobs in view',
      },
      access: {
        title: 'Email OTP session',
        email: 'Email',
        code: 'Verification code',
        sendOtp: 'Send OTP',
        verifySession: 'Verify session',
        refresh: 'Refresh',
        logout: 'Logout',
        authHint:
          'Authenticate first. The console will then load your profile, wallets, and jobs.',
      },
      profile: {
        title: 'Account policy and wallet state',
        user: 'User',
        shariahMode: 'Shariah mode',
        defaultExecutionWallet: 'Default execution wallet',
        toggleShariah: 'Toggle Shariah mode',
        reloadAccount: 'Reload account',
        setDefault: 'Set default',
        smartAccount: 'Smart account',
        eoa: 'EOA',
      },
      setup: {
        title: 'Activation checklist',
        nextBlockerTitle: 'Next blocker',
        clientTrackTitle: 'Ready to create contracts',
        clientTrackReady:
          'This session has the linked owner wallet and a default smart account for client-side contract creation.',
        clientTrackNeedsSignIn:
          'Sign in first so the app can restore your wallets and contract actions.',
        clientTrackNeedsWalletLink:
          'Link the owner EOA you plan to use before provisioning a smart account.',
        clientTrackNeedsSmartAccount:
          'Provision and set a smart account as the default execution wallet before creating contracts.',
        contractorTrackTitle: 'Ready to open contractor invite links',
        contractorTrackReady:
          'This session can open invite links and validate the exact worker wallet required by a contract.',
        contractorTrackNeedsSignIn:
          'Sign in first so the app can evaluate contractor invite readiness.',
        contractorTrackNeedsWalletLink:
          'Link the exact worker wallet from the contractor invite before trying to join a contract.',
        blockers: {
          signIn: 'Start with OTP sign-in.',
          connectWallet: 'Connect the browser wallet you want to link.',
          linkWallet: 'Link an EOA so the app can trust a real signing wallet.',
          provisionSmartAccount:
            'Provision a smart account if you want this session to create client contracts.',
          ready:
            'Setup is complete for both contract creation and invite-based contractor access.',
        },
      },
      wallet: {
        walletLinkTitle: 'Browser wallet onboarding',
        walletLink: 'Wallet Link',
        browserWalletHeading: 'Browser wallet onboarding',
        connected: 'Injected wallet connected',
        unavailable: 'No injected wallet detected',
        ready: 'Injected wallet ready to connect',
        chainUnknown: 'Chain unknown',
        noActiveAccount: 'No active account',
        connectWallet: 'Connect injected wallet',
        linkWallet: 'Link connected wallet',
        eoaAddress: 'EOA address',
        label: 'Label',
        chainId: 'Chain id',
        fallbackHint:
          'Use the injected-wallet buttons for the native browser flow. The manual challenge path remains available as a fallback for wallets that do not expose `personal_sign`.',
        createChallenge: 'Create SIWE challenge',
        issuedMessage: 'Issued message',
        walletSignature: 'Wallet signature',
        verifyLinkedWallet: 'Verify linked wallet',
        provisioning: 'Provisioning',
        smartAccountTitle: 'Smart-account execution wallet',
        verifiedOwnerEoa: 'Verified owner EOA',
        executionLabel: 'Execution label',
        provisionSmartAccount: 'Provision smart account',
        smartAccountHint:
          'The API requires a SIWE-verified owner wallet before job creation can use a sponsored smart account.',
      },
      composer: {
        title: 'Guided client job authoring',
        steps: {
          scope: {
            label: 'Scope',
            description: 'Define the work, category, and expected outcome.',
          },
          counterparty: {
            label: 'Counterparty',
            description: 'Set the worker wallet and settlement posture.',
          },
          plan: {
            label: 'Plan',
            description: 'Review milestones, commercial terms, and launch readiness.',
          },
        },
        targetExperience: 'Target experience',
        targetExperienceValue: 'Productized escrow launch',
        draftedMilestones: 'Drafted milestones',
        totalDraftedAmount: 'Total drafted amount',
        scopeHint:
          'Write the scope in business language first. The API terms will be generated from the structured plan below.',
        jobTitle: 'Job title',
        projectSummary: 'Project summary',
        category: 'Category',
        contractorEmail: 'Contractor email',
        workerWallet: 'Worker wallet',
        settlementTokenAddress: 'Settlement token address',
        settlementAssetLabel: 'Settlement asset label',
        settlementChain: 'Settlement chain',
        executionWalletPosture: 'Execution wallet posture',
        readyToCreateJobs: 'Ready to create jobs',
        smartAccountRequired: 'Smart account required',
        counterpartyCheck: 'Counterparty check',
        contractorIdentityCaptured: 'Contractor identity captured',
        contractorIdentityIncomplete: 'Contractor identity incomplete',
        counterpartyHint:
          'The contractor must join with this email and this worker wallet.',
        reviewWindowDays: 'Review window in days',
        disputeModel: 'Dispute model',
        evidenceExpectation: 'Evidence expectation',
        kickoffNote: 'Kickoff note',
        commercialPlan: 'Commercial plan',
        readyMilestones: (count: number) => `${count} ready milestones`,
        contractorJoinHint: (email: string, wallet: string) =>
          `Contractor join requires ${email || 'the pending contractor email'} and ${wallet || 'the bound worker wallet'} from the shared contract link.`,
        totalDraftedMilestoneAmount: (count: number) =>
          `Total drafted milestone amount: ${count || 0}`,
        back: 'Back',
        next: 'Next',
        createGuidedJob: 'Create guided job',
        jobCreated: 'Job created',
        reviewSelectedJob: 'Review selected job',
        commitDraftedMilestones: 'Commit drafted milestones',
        stageFundingFromMilestoneTotal: 'Stage funding from milestone total',
        milestoneDrafting: 'Milestone drafting',
        addMilestone: 'Add milestone',
        commitMilestones: 'Commit milestones',
        useDraftedMilestoneTotal: 'Use drafted milestone total',
        checklistReady: 'Ready',
        checklistPending: 'Pending',
        checklist: {
          scopeDefined: 'Scope is defined',
          contractorEmailSet: 'Contractor email is set',
          workerWalletSet: 'Worker wallet is set',
          settlementTokenSet: 'Settlement token address is set',
          defaultWalletReady: 'Default execution wallet is a provisioned smart account',
          milestoneReady: 'At least one milestone draft is ready',
        },
        categories: {
          'software-development': 'Software development',
          design: 'Design',
          marketing: 'Marketing',
          research: 'Research',
          product: 'Product',
          operations: 'Operations',
        },
      },
      portfolio: {
        title: 'Your job index',
        emptyTitle: 'No jobs available',
        emptyMessage: 'No jobs are available yet for the current identity.',
      },
      selectedJob: {
        title: 'Selected Job',
        placeholder: 'Select a job to manage lifecycle actions',
        status: 'Status',
        fundedAmount: 'Funded amount',
        escrowId: 'Escrow id',
        updated: 'Updated',
        clientWallet: 'Client wallet',
        contractorWallet: 'Contractor wallet',
        contractorJoin: 'Contractor join',
        reviewWindow: 'Review window',
        disputeModel: 'Dispute model',
        evidenceExpectation: 'Evidence expectation',
        operatorResolution: 'Operator resolution',
        contractorActivationTitle: 'Contractor activation',
        operatorAudience: 'Operator',
        operatorTaskTitle: 'Operator task',
        nextActionsTitle: 'Next actions',
        nextActionsCopy:
          'Use the current role and milestone posture to move the selected contract forward.',
        currentFocus: 'Current focus',
        contractorJoinAccess: 'Contractor join access',
        pendingContractorEmail: 'Pending contractor email',
        copyContractorLink: 'Copy contractor link',
        regenerateContractorLink: 'Regenerate link',
        sendContractorInvite: 'Send invite email',
        resendContractorInvite: 'Resend invite email',
        rotateAndResendContractorInvite: 'Rotate and resend',
        updateContractorEmail: 'Update contractor email',
        joinContract: 'Join contract',
        noMilestonesTitle: 'No milestones committed yet',
        noMilestonesMessage:
          'Fund the job and commit milestone checkpoints before delivery actions can begin.',
        clientWorkspace: 'Client workspace',
        workerWorkspace: 'Worker workspace',
        sharedDisputePosture: 'Shared dispute posture',
        operatorPosture: 'Operator posture',
        selectedMilestone: 'Selected milestone',
        noMilestoneSelected: 'No milestone selected',
        selectedMilestoneContext:
          'Inline context for the checkpoint currently in focus.',
        milestoneTimeline: 'Milestone timeline',
        milestoneAuditTrail: 'Milestone audit trail',
        milestoneReceipts: 'Milestone receipts',
        jobLaunchHistory: 'Job launch history',
        deliveryNote: 'Delivery note',
        evidenceLinks: 'Evidence links',
        disputeReason: 'Dispute reason',
        disputeEvidenceLinks: 'Dispute evidence links',
        resolution: 'Resolution',
        amount: 'Amount',
        due: 'Due',
        noMilestoneContext:
          'Select a committed milestone to inspect delivery evidence and action posture.',
        noMilestoneTimeline:
          'No milestone timeline events recorded yet for the current selection.',
        noMilestoneAudit:
          'No milestone-specific audit events recorded yet.',
        noMilestoneReceipts:
          'No milestone-specific execution receipts recorded yet.',
        noJobAudit: 'No job-level audit events recorded yet.',
        noJobReceipts: 'No job-level execution receipts recorded yet.',
        selectJobMessage:
          'Select a job from the index to view its milestones, audit events, and receipts.',
        clientWorkspaceCopy:
          'Fund the escrow, commit milestone checkpoints, and release accepted work with explicit receipt posture.',
        workerWorkspaceCopy:
          'Deliver milestone evidence with explicit pending and confirmation posture.',
        sharedDisputeCopy:
          'Both participants should see the same selected milestone, current state, and escalation evidence.',
        operatorPostureCopy:
          'Privileged operator workflows are still incomplete. Resolution remains available here only for sessions that already control the configured arbitrator wallet.',
        operatorTaskWaitingSummary:
          'A disputed milestone is waiting for arbitrator action.',
        operatorTaskWaitingDetail:
          'If this milestone remains disputed, the configured arbitrator wallet can resolve it from the operator console.',
        operatorTaskIdleSummary: 'No operator action is currently required.',
        operatorTaskIdleDetail:
          'Operator review becomes relevant only when a participant escalates the selected milestone into dispute.',
      },
      actions: {
        fundSelectedJob: 'Fund selected job',
        releaseSelectedMilestone: 'Release selected milestone',
        deliverSelectedMilestone: 'Deliver selected milestone',
        openDispute: 'Open dispute',
        resolveDispute: 'Resolve dispute',
        resolutionAction: 'Resolution action',
        resolutionNote: 'Resolution note',
        disputeEvidenceUrls: 'Dispute evidence URLs',
        evidenceUrls: 'Evidence URLs',
        fundAmount: 'Fund amount',
      },
      emptyStates: {
        contractorWalletRequired: 'Contractor wallet required',
        clientWalletRequired: 'Client wallet required',
      },
      labels: {
        runtimeProfile: {
          'deployment-like': 'Deployment-like',
          'local-mock': 'Local mock',
          mixed: 'Mixed',
        },
        lifecyclePhase: {
          ready: 'Ready',
          pending: 'Pending',
          confirmed: 'Confirmed',
          failed: 'Failed',
          blocked: 'Blocked',
        },
        jobStatus: {
          draft: 'Draft',
          funded: 'Funded',
          in_progress: 'In progress',
          completed: 'Completed',
          disputed: 'Disputed',
          resolved: 'Resolved',
        },
        milestoneStatus: {
          pending: 'Pending',
          delivered: 'Delivered',
          released: 'Released',
          disputed: 'Disputed',
          refunded: 'Refunded',
        },
        contractorParticipation: {
          pending: 'Pending',
          joined: 'Joined',
        },
        role: {
          client: 'Client',
          worker: 'Worker',
          observer: 'Observer',
        },
        resolutionAction: {
          release: 'Release',
          refund: 'Refund',
        },
      },
      messages: {
        joinAccessSignedOut: (emailHint: string | null) =>
          `Sign in with ${emailHint || 'the invited contractor email'} from this invite link before trying to join the contract.`,
        joinAccessJoined:
          'This contract has already been joined by the bound contractor identity.',
        joinAccessWrongEmail: (emailHint: string | null) =>
          `This session is signed in with the wrong email. Use ${emailHint || 'the invited contractor email'} from the contractor invite.`,
        joinAccessInviteRequired:
          'This page does not include a live contractor invite token. Ask the client to resend or copy a fresh invite link.',
        joinAccessInviteInvalid:
          'This contractor invite link is no longer valid. Ask the client to regenerate and resend it.',
        joinAccessClaimed:
          'This contract has already been claimed by a different contractor identity.',
        joinAccessWalletNotLinked: (wallet: string) =>
          `Link ${wallet} before joining this contract.`,
        joinAccessWrongWallet: (wallet: string) =>
          `This session has linked wallets, but not the bound worker wallet ${wallet}.`,
        joinAccessReady:
          'This session controls the bound worker wallet and is ready for contractor join.',
        deliveryRequiresWallet: (wallet: string) =>
          `Link ${wallet} before delivering this milestone.`,
        disputeRequiresWallet: (wallet: string) =>
          `Link ${wallet} before opening a milestone dispute.`,
        clientRoleRefresh:
          'This session controls the client wallet, but the contract list has not refreshed into a writable client role yet.',
        signInForDelivery:
          'Sign in and link the exact contractor wallet from the shared contract link before delivery is enabled.',
        signInForDispute:
          'Sign in and link the exact client wallet from the shared contract link before dispute actions are enabled.',
        onlyClientCanDispute:
          'Only the client wallet can open a dispute in this launch flow.',
        shariahModeUpdated: (enabled: boolean) =>
          `Shariah mode ${enabled ? 'enabled' : 'disabled'}.`,
      },
      lifecycle: {
        submitting: 'Submitting',
        waitingForApiConfirmation:
          'Waiting for the API to confirm the latest request.',
        blocked: 'Blocked',
        retryNeeded: 'Retry needed',
        fundingConfirmedSummary: 'Funding confirmed',
        fundingConfirmedDetail: (fundedAmount: string | null) =>
          `The escrow is funded with ${fundedAmount ?? 'the required amount'} and is ready for milestone setup.`,
        readyToFundSummary: 'Ready to fund',
        readyToFundDetail:
          'Submit escrow funding before milestones can be committed onchain.',
        commitMilestonesTitle: 'Commit milestones',
        fundEscrowTitle: 'Fund escrow',
        milestonesCommittedSummary: 'Milestones committed',
        milestonesCommittedDetail: (count: number) =>
          `${count} milestone${count === 1 ? '' : 's'} recorded for this job.`,
        fundingRequiredBeforeMilestones:
          'Funding must be confirmed before milestones can be committed.',
        readyToCommitSummary: 'Ready to commit',
        readyToCommitDetail:
          'Commit the drafted milestones so the worker can start delivering against named checkpoints.',
        commitMilestonesFirst:
          'Commit milestones first. There is no active milestone to manage yet.',
        selectValidMilestone: 'Select a valid milestone to continue.',
        workerDeliveryTitle: 'Worker delivery',
        deliveryRecordedSummary: 'Delivery recorded',
        deliveryRecordedDetail:
          'The worker has submitted the deliverable and evidence for review.',
        pendingMilestonesOnly: 'Only pending milestones can be delivered.',
        readyForDeliverySummary: 'Ready for delivery',
        readyForDeliveryDetail:
          'Submit the delivery note and evidence URLs for the selected milestone.',
        clientReleaseTitle: 'Client release',
        releasedSummary: 'Released',
        releasedDetail: 'The client accepted the milestone and released the payout.',
        resolveInsteadOfRelease:
          'This milestone is disputed. Resolve the dispute instead of releasing directly.',
        alreadyRefunded: 'This milestone has already been refunded.',
        deliveredOnlyForRelease: 'Only delivered milestones can be released.',
        readyForReleaseSummary: 'Ready for release',
        readyForReleaseDetail:
          'Release payment once the delivery note and evidence are accepted.',
        openDisputeTitle: 'Open dispute',
        disputeOpenedSummary: 'Dispute opened',
        disputeOpenedDetail: 'The milestone has been escalated for resolution.',
        alreadyReleased: 'This milestone has already been released.',
        deliveredOnlyForDispute: 'Only delivered milestones can be disputed.',
        readyToDisputeSummary: 'Ready to dispute',
        readyToDisputeDetail:
          'Escalate the selected delivered milestone if the submission is contested.',
        resolveDisputeTitle: 'Resolve dispute',
        resolutionRecordedSummary: 'Resolution recorded',
        resolutionRecordedDetail: (action: string) => `Resolved with ${action}.`,
        resolutionRecordedFallback: 'The dispute has been resolved.',
        disputedOnlyForResolution: 'Only disputed milestones can be resolved.',
        readyToResolveSummary: 'Ready to resolve',
        readyToResolveDetail:
          'Operator resolution should only be used when the acting wallet controls the configured arbitrator account.',
        timelineDue: 'Due',
        timelineDueDetail: 'Target delivery checkpoint',
        timelineDelivered: 'Delivered',
        timelineDeliveredDetail:
          'Delivery note and evidence were submitted for review.',
        timelineDisputed: 'Disputed',
        timelineDisputedDetail: 'Delivery was escalated for operator review.',
        timelineResolved: 'Resolved',
        timelineResolvedDetail: (action: string) => `Resolved with ${action}.`,
        timelineReleased: 'Released',
        timelineReleasedDetail: 'Payout released to the worker.',
      },
    },
  },
  ar: {
    languageName: 'Arabic',
    languageNativeName: 'العربية',
    common: {
      brand: 'ضمان المراحل',
      productSurface: 'واجهة العميل',
      productConsole: 'لوحة العميل',
      operatorConsole: 'لوحة المشغّل',
      currentLanguage: 'اللغة',
      home: 'الرئيسية',
      marketplace: 'السوق',
      trust: 'الثقة',
      signIn: 'تسجيل الدخول',
      startEscrow: 'ابدأ ضمان المراحل',
      startContract: 'ابدأ العقد',
      loading: 'جاري التحميل',
      unavailable: 'غير متاح',
      unknown: 'غير معروف',
      authenticated: 'تم تسجيل الدخول',
      signedOut: 'تم تسجيل الخروج',
      enabled: 'مفعّل',
      disabled: 'غير مفعّل',
      notSet: 'غير محدد',
      noneConfigured: 'لا يوجد إعداد',
      noReceiptYet: 'لا يوجد إيصال بعد',
      noDueDate: 'لا يوجد تاريخ استحقاق',
      notFunded: 'غير ممول',
      pending: 'قيد الانتظار',
      legacy: 'قديم',
      observer: 'مراقب',
      joined: 'تم الانضمام',
      walletVerified: 'تم التحقق من المحفظة',
      setupRequired: 'الإعداد مطلوب',
      shareLinkReady: 'الرابط جاهز للمشاركة',
      readyToJoin: 'جاهز للانضمام',
      yes: 'نعم',
      no: 'لا',
      profile: 'الحساب',
      runtime: 'التشغيل',
      ready: 'جاهز',
      days: (count: number) => `${count} يوم`,
      milestoneNumber: (index: number, title: string) => `${title} .${index}`,
      dueAt: (value: string) => `الاستحقاق ${value}`,
    },
    marketing: {
      heroEyebrow: 'أعمال الوكالات والعملاء على Base',
      heroTitle: 'ضمان مراحل احترافي لأعمال الخدمات الرقمية',
      heroLead:
        'يتم حجز أموال العميل مسبقاً، ثم الإفراج عنها لكل مرحلة، مع معالجة النزاعات عبر سجل تدقيق واضح على Base. هذا الإصدار مبني لمسار محدد: العميل يمول، المقاول يسلّم، العميل يفرج أو يعترض، والمشغّل يحسم النزاع.',
      trustCta: 'اطّلع على نموذج الثقة',
      stats: [
        {
          title: 'تهيئة تبدأ بالبريد الإلكتروني',
          body: 'تسجيل الدخول عبر OTP مع ربط المحفظة يجعل البدء أخف من المسارات المعتمدة على المحفظة فقط.',
        },
        {
          title: 'تدفق الإفراج والنزاع لكل مرحلة',
          body: 'التمويل والتسليم والإفراج والنزاع والحسم التشغيلي كلها مطبقة بالفعل داخل المستودع.',
        },
        {
          title: 'تاريخ قضية ظاهر للمشغّل',
          body: 'كل عقد يعرض حزمة تدقيق وإيصالات تنفيذ وملفات قضية قابلة للتصدير.',
        },
      ],
      howItWorksTitle: 'كيف يعمل المنتج',
      steps: [
        {
          title: 'الإنشاء والتمويل',
          body: 'ينشئ العميل عقد المراحل ويربط محفظة المقاول ثم يمول الضمان.',
        },
        {
          title: 'التسليم والمراجعة',
          body: 'ينضم المقاول عبر الرابط المشترك ويسجل الدخول ويربط المحفظة الصحيحة ثم يرسل أدلة التسليم.',
        },
        {
          title: 'الإفراج أو النزاع',
          body: 'يفرج العميل عن المرحلة أو يفتح نزاعاً. ويقوم المشغّل بالحسم من سجل القضية الظاهر.',
        },
      ],
      productBoundsTitle: 'ما الذي يقدمه هذا الإصدار وما الذي لا يقدمه',
      bounds: [
        {
          title: 'هو مسار ضمان مركز لأعمال العميل والمقاول.',
          body: 'عميل واحد، مقاول واحد، مشغّل واحد، سلسلة واحدة، ونموذج عقد خدمات قائم على المراحل.',
        },
        {
          title: 'هو سوق يبدأ بالضمان وليس منصة مدمجة.',
          body: 'يوجد الآن اكتشاف مواهب وعروض موجزة منسقة، لكن الإغلاق ما زال ينتقل إلى مسار ضمان بعقد عميل واحد مع مقاول واحد وعلى سلسلة واحدة.',
        },
        {
          title: 'ادعاءات الثقة تبقى محدودة ودقيقة.',
          body: 'المنتج يعرض ما هو مطبق الآن وما يزال يحتاج إلى إثبات مباشر في بيئة مرحلية قبل وصفه بأنه مثبت إنتاجياً.',
        },
      ],
      trustPage: {
        escrowTitle: 'كيف يعمل الضمان هنا',
        escrowIntro:
          'يتم حجز الأموال داخل عقد خدمة قائم على المراحل بدلاً من إرسال دفعة مقدمة غير رسمية. يتم ربط محفظة المقاول عند إنشاء العقد، ولا يمكن إلا لتلك المحفظة العمل كمقاول ضمن هذا التدفق.',
        escrowList: [
          'يمول العميل المهمة قبل بدء تسليم المراحل.',
          'يسلّم المقاول على المرحلة الممولة مع ملاحظة تسليم وروابط أدلة.',
          'يفرج العميل عن المرحلة أو يفتح نزاعاً مع سبب وروابط أدلة.',
        ],
        disputesTitle: 'كيف تعمل النزاعات',
        disputesIntro:
          'تبقى النزاعات محصورة على مستوى المرحلة. لا يعمل المشغّل كمدير خفي؛ فالنموذج الحالي يستخدم محفظة المحكّم المهيأة كجهة الحسم المحددة.',
        disputesList: [
          'يرى المشغّل حالة المرحلة وملاحظة التسليم وأدلة التسليم وسبب النزاع وأدلته وأحداث التدقيق والإيصالات.',
          'يسجل المشغّل قرار الإفراج أو الاسترداد مع ملاحظة الحسم.',
          'تبقى القضية قابلة للتصدير كملفات job-history و dispute-case.',
        ],
        implementedTitle: 'ما هو مطبق اليوم',
        proofCards: [
          {
            title: 'مطبق داخل المستودع',
            body: 'مصادقة OTP وربط المحافظ وتهيئة الحساب الذكي وتمويل العميل وتسليم المقاول ونزاع العميل وحسم المشغّل والاطلاع على حزمة التدقيق وملفات التصدير.',
          },
          {
            title: 'ظاهر داخل المنتج',
            body: 'رابط العقد المشترك وحالات الإجراءات لكل دور وأدلة المراحل وأدلة النزاع ومراجعة قضية المشغّل ووضع الجاهزية التشغيلية.',
          },
          {
            title: 'لا يزال قيد التحقق المباشر',
            body: 'أدلة الإصدار المرحلي الحقيقية واختبارات المرحّلات والتنبيهات المباشرة وإثباتات بيئات النشر ما زالت تحتاج إلى تنفيذ خارج المستودع.',
          },
        ],
      },
    },
    publicMarketplace: {
      navWorkspace: 'مساحة عمل السوق',
      openWorkspace: 'افتح مساحة العمل',
      directContractPath: 'المسار المباشر للعقد',
      heroEyebrow: 'سوق يبدأ بالضمان',
      heroTitle: 'وظّف عبر عروض موجزة منسقة ثم حوّل الاختيار الفائز إلى الضمان.',
      heroLead:
        'تصفح المواهب الموثقة، وانشر عروضاً خاصة أو عامة، ثم انقل الطلب المختار مباشرة إلى تدفق ضمان المراحل الحالي.',
      loadFailure: 'تعذر تحميل تغذية السوق حالياً.',
      stats: {
        visibleTalentTitle: (count: number) =>
          `${count} ملف موهبة ظاهر`,
        visibleTalentBody:
          'لا تظهر الملفات إلا بعد اكتمالها واجتيازها حالة الظهور الإشرافي.',
        openBriefsTitle: (count: number) => `${count} عرض موجز مفتوح`,
        openBriefsBody:
          'يمكن تصفح العروض العامة، بينما تبقى العروض الخاصة قابلة للوصول عبر الرابط المباشر.',
        escrowCloseTitle: 'كل توظيف يغلق داخل عقد ضمان واحد',
        escrowCloseBody:
          'السوق هنا طبقة لاكتشاف المرشحين، وليس مسار تسوية منفصل.',
      },
      featuredTalentTitle: 'مواهب مميزة',
      noProfilesTitle: 'لا توجد ملفات مواهب عامة بعد',
      noProfilesBody:
        'تظهر الملفات هنا بعد أن يكمل المقاولون ملفاتهم من مساحة عمل السوق.',
      openOpportunitiesTitle: 'الفرص المفتوحة',
      noOpportunitiesTitle: 'لا توجد عروض عامة بعد',
      noOpportunitiesBody:
        'يمكن للعملاء نشر العروض من مساحة عمل السوق الموثقة.',
      expansionTitle: 'كيف يوسّع هذا مسار المنتج',
      expansionCards: [
        {
          title: 'اكتشاف قبل إنشاء العقد',
          body: 'يمكن للعملاء الآن الوصول إلى المواهب عبر الملفات والعروض العامة والطلبات قبل إنشاء الضمان.',
        },
        {
          title: 'يبقى المسار قائماً على الضمان',
          body: 'يغلق الطلب المختار داخل تدفق ضمان المراحل نفسه ومسار النزاع والمراجعة التشغيلية ذاته.',
        },
        {
          title: 'مفيد من دون أن يصبح فوضوياً',
          body: 'هذا مسار مطابقة لعروض موجزة منسقة وليس جدار مزايدات مفتوحاً، لذلك يبقى أقرب لتوظيف الشركات الناشئة ونموذج الثقة الحالي.',
        },
      ],
      actions: {
        viewProfile: 'عرض الملف',
        viewBrief: 'عرض العرض',
        backToMarketplace: 'العودة إلى السوق',
        applyFromWorkspace: 'قدّم من مساحة العمل',
      },
      labels: {
        verifiedWallet: 'محفظة موثقة',
        visibility: {
          public: 'عرض عام',
          private: 'عرض خاص',
        },
        verificationLevel: {
          wallet_verified: 'محفظة موثقة',
          wallet_and_escrow_history: 'محفظة مع سجل ضمان',
          wallet_escrow_and_delivery: 'محفظة مع سجل ضمان وتسليم',
        },
        cryptoReadiness: {
          wallet_only: 'محفظة فقط',
          smart_account_ready: 'جاهز بالحساب الذكي',
          escrow_power_user: 'مستخدم متقدم للضمان',
        },
        engagementType: {
          fixed_scope: 'نطاق ثابت',
          milestone_retainer: 'احتفاظ قائم على المراحل',
          advisory: 'استشاري',
        },
        escrowReadiness: {
          ready: 'جاهز',
          wallet_required: 'المحفظة مطلوبة',
          smart_account_required: 'الحساب الذكي مطلوب',
        },
        averageContractValueBand: {
          small: 'صغير',
          medium: 'متوسط',
          large: 'كبير',
          unknown: 'غير معروف',
        },
        proofArtifactKind: {
          portfolio: 'معرض أعمال',
          escrow_delivery: 'تسليم ضمان',
          escrow_case: 'حالة ضمان',
          external_case_study: 'دراسة حالة خارجية',
        },
      },
      profileDetail: {
        topBarLabel: 'ملف السوق',
        topBarMeta: 'تفاصيل عامة للمقاول مع مؤشرات ثقة مستمدة من الضمان.',
        unavailableTitle: 'الملف غير متاح',
        unavailableBody: 'تعذر تحميل هذا الملف حالياً.',
        loadingTitle: 'جارٍ تحميل الملف…',
        heroEyebrow: 'ملف الموهبة',
        verification: 'التحقق',
        cryptoReadiness: 'الجاهزية للعملات الرقمية',
        completedEscrowJobs: 'العقود المكتملة عبر الضمان',
        aboutEyebrow: 'نبذة',
        credibilityTitle: 'ملخص الموثوقية',
        skills: 'المهارات',
        specialties: 'التخصصات',
        preferredEngagements: 'أنماط الارتباط المفضلة',
        rateRange: 'نطاق السعر',
        noneListed: 'لا يوجد',
        notListed: 'غير مدرج',
        escrowSignalEyebrow: 'إشارة الضمان',
        executionTitle: 'سجل تنفيذ موثق',
        completionRate: 'معدل الإكمال',
        disputeRate: 'معدل النزاع',
        onTimeDelivery: 'التسليم في الوقت',
        averageContractBand: 'متوسط قيمة العقد',
        completedByCategory: 'العقود المكتملة حسب الفئة',
        noEscrowHistory: 'لا يوجد سجل ضمان مكتمل بعد.',
        proofEyebrow: 'إثبات',
        walletAndProofTitle: 'المحفظة ومواد الإثبات',
        verifiedWallet: 'المحفظة الموثقة',
        noVerifiedWallet: 'لا توجد محفظة موثقة منشورة',
      },
      opportunityDetail: {
        topBarLabel: 'فرصة في السوق',
        topBarMeta: 'تفاصيل موجز جاهز لاتخاذ القرار قبل التحويل إلى الضمان.',
        unavailableTitle: 'الفرصة غير متاحة',
        unavailableBody: 'تعذر تحميل هذا العرض حالياً.',
        loadingTitle: 'جارٍ تحميل العرض…',
        client: 'العميل',
        applications: 'الطلبات',
        escrowReadiness: 'جاهزية الضمان',
        briefEyebrowFallback: 'عرض موجز',
        briefEyebrow: (visibilityLabel: string) => visibilityLabel,
        briefEyebrowSuffix: 'موجز',
        scopeEyebrow: 'العرض',
        scopeTitle: 'النطاق والنتائج',
        category: 'الفئة',
        timeline: 'الجدول الزمني',
        budget: 'الميزانية',
        settlementToken: 'رمز التسوية',
        desiredStart: 'موعد البدء المطلوب',
        timezoneOverlap: 'التداخل الزمني',
        notSpecified: 'غير محدد',
        hours: (count: number) => `${count} ساعة`,
        hiringSpecEyebrow: 'مواصفات التوظيف',
        fitRequirementsTitle: 'متطلبات الملاءمة',
        requiredSkills: 'المهارات المطلوبة',
        mustHaveSkills: 'المهارات الأساسية',
        engagementType: 'نوع الارتباط',
        cryptoReadinessRequired: 'الجاهزية الرقمية المطلوبة',
        outcomes: 'النتائج',
        acceptanceCriteria: 'معايير القبول',
        screeningQuestions: 'أسئلة الفرز',
        noScreeningQuestions: 'لا توجد أسئلة فرز محددة.',
      },
      reporting: {
        eyebrow: 'الثقة والسلامة',
        title: 'أبلغ عن هذا الإدراج',
        intro:
          'أبلغ عن الرسائل المزعجة أو الاحتيال أو الانتحال أو إساءة السياسات لمراجعة المشغّل.',
        reason: 'السبب',
        details: 'التفاصيل',
        evidenceUrls: 'روابط الأدلة',
        detailsPlaceholder: 'اشرح ما حدث ولماذا يجب مراجعته.',
        evidencePlaceholder: 'ألصق الروابط الداعمة، رابطاً في كل سطر.',
        submit: 'إرسال البلاغ',
        submitting: 'جارٍ الإرسال…',
        signInRequired:
          'سجّل الدخول من مساحة عمل التطبيق قبل إرسال البلاغ.',
        otherReasonRequired:
          'التفاصيل الإضافية مطلوبة عندما يكون سبب البلاغ هو "أخرى".',
        submitted: (subjectLabel: string) => `تم إرسال بلاغ بخصوص ${subjectLabel}.`,
        failedSubmit: 'تعذر إرسال البلاغ.',
        reasons: {
          spam: 'رسائل مزعجة',
          scam: 'احتيال',
          impersonation: 'انتحال',
          harassment: 'مضايقة',
          off_platform_payment: 'دفع خارج المنصة',
          policy_violation: 'مخالفة سياسة',
          other: 'أخرى',
        },
      },
    },
    console: {
      topBarLabel: 'واجهة ثنائية اللغة',
      topBarMeta:
        'يمكنك التبديل فوراً بين الإنجليزية والعربية. العربية تستخدم تخطيط RTL كامل مع إبقاء القيم التقنية مقروءة باتجاه LTR.',
      frames: {
        signIn: {
          eyebrow: 'تسجيل الدخول',
          title: 'ابدأ جلسة ضمان المراحل.',
          copy:
            'ابدأ أولاً بتسجيل الدخول عبر OTP. بعد ذلك سيعيد التطبيق تحميل صلاحياتك والعناوين المرتبطة وإجراءات العقد.',
        },
        setup: {
          eyebrow: 'الإعداد',
          title: 'اربط المحفظة الصحيحة قبل تحريك الأموال.',
          copy:
            'يحتاج العميل إلى حساب ذكي مهيأ لإنشاء العقود. ويحتاج المقاول إلى ربط محفظة التسليم المطابقة قبل أن يتمكن من الانضمام والتسليم.',
        },
        newContract: {
          eyebrow: 'عقد جديد',
          title: 'أنشئ عقد خدمة واحداً قائماً على المراحل.',
          copy:
            'اربط محفظة المقاول من البداية، وحدد المراحل بلغة الأعمال، وراجع نموذج الإفراج والنزاع قبل التمويل.',
        },
        contract: {
          eyebrow: 'العقد',
          title: 'راجع عقداً واحداً وفق قواعد الجهات الدقيقة.',
          copy:
            'يمكن فتح هذا الرابط المشترك بواسطة العميل أو المقاول. لا تتفعّل الإجراءات إلا عندما يتحكم الحساب المسجل بالمحفظة المطلوبة.',
        },
        deliver: {
          eyebrow: 'التسليم',
          title: 'أرسل تسليم المرحلة مع أدلة واضحة.',
          copy:
            'ينضم المقاول من خلال رابط العقد المشترك، ويسجل الدخول، ويربط المحفظة المحددة، ثم يسلّم المرحلة الممولة.',
        },
        dispute: {
          eyebrow: 'النزاع',
          title: 'صعّد مرحلة واحدة مع مسار أدلة واضح.',
          copy:
            'تبقى النزاعات على مستوى المرحلة. يسجل العميل المشكلة وروابط الإثبات، ثم يحسم المشغّل من سجل التدقيق الظاهر.',
        },
        overview: {
          eyebrow: 'لوحة العميل',
          title: 'أدر دورة حياة الضمان من OTP حتى حسم النزاع.',
          copy:
            'هذه الواجهة مرتبطة بوحدات API الحقيقية الموجودة في المستودع: المصادقة وربط المحافظ عبر SIWE وتهيئة الحساب الذكي وإنشاء الأعمال وإجراءات المراحل ومراجعة التدقيق العام.',
        },
      },
      runtime: {
        title: 'التحقق من ملف التشغيل الخلفي',
        profile: 'الملف',
        providers: 'المزوّدون',
        arbitratorWallet: 'محفظة المحكّم',
        frontendOrigin: 'مصدر الواجهة',
        corsReadiness: 'جاهزية CORS',
        apiTransport: 'نقل API',
        persistence: 'الاستمرارية',
        trustProxy: 'الوكيل الموثوق',
        allowedOrigins: 'المصادر المسموح بها',
        backendProfile: 'ملف التشغيل الخلفي',
        apiBaseUrl: 'عنوان API الأساسي',
        session: 'الجلسة',
        jobsInView: 'العقود المعروضة',
      },
      access: {
        title: 'جلسة البريد OTP',
        email: 'البريد الإلكتروني',
        code: 'رمز التحقق',
        sendOtp: 'إرسال OTP',
        verifySession: 'تأكيد الجلسة',
        refresh: 'تحديث',
        logout: 'تسجيل الخروج',
        authHint:
          'سجل الدخول أولاً. بعد ذلك ستقوم اللوحة بتحميل الحساب والمحافظ والمهام الخاصة بك.',
      },
      profile: {
        title: 'سياسة الحساب وحالة المحافظ',
        user: 'المستخدم',
        shariahMode: 'وضع الشريعة',
        defaultExecutionWallet: 'محفظة التنفيذ الافتراضية',
        toggleShariah: 'تبديل وضع الشريعة',
        reloadAccount: 'إعادة تحميل الحساب',
        setDefault: 'تعيين كافتراضي',
        smartAccount: 'حساب ذكي',
        eoa: 'محفظة EOA',
      },
      setup: {
        title: 'قائمة تفعيل مختصرة',
        nextBlockerTitle: 'العائق التالي',
        clientTrackTitle: 'جاهز لإنشاء العقود',
        clientTrackReady:
          'تحتوي هذه الجلسة على محفظة مالك مرتبطة وحساب ذكي افتراضي لإنشاء العقود من جهة العميل.',
        clientTrackNeedsSignIn:
          'سجّل الدخول أولاً حتى يتمكن التطبيق من استعادة المحافظ وإجراءات العقد.',
        clientTrackNeedsWalletLink:
          'اربط محفظة المالك EOA التي تنوي استخدامها قبل تهيئة الحساب الذكي.',
        clientTrackNeedsSmartAccount:
          'هيّئ حساباً ذكياً واجعله محفظة التنفيذ الافتراضية قبل إنشاء العقود.',
        contractorTrackTitle: 'جاهز لفتح روابط دعوة المقاول',
        contractorTrackReady:
          'يمكن لهذه الجلسة فتح روابط الدعوة والتحقق من محفظة العامل الدقيقة المطلوبة في العقد.',
        contractorTrackNeedsSignIn:
          'سجّل الدخول أولاً حتى يتمكن التطبيق من تقييم جاهزية دعوة المقاول.',
        contractorTrackNeedsWalletLink:
          'اربط محفظة العامل الدقيقة من دعوة المقاول قبل محاولة الانضمام إلى العقد.',
        blockers: {
          signIn: 'ابدأ بتسجيل الدخول عبر OTP.',
          connectWallet: 'صل محفظة المتصفح التي تريد ربطها.',
          linkWallet: 'اربط محفظة EOA حتى يثق التطبيق في محفظة توقيع حقيقية.',
          provisionSmartAccount:
            'هيّئ حساباً ذكياً إذا كنت تريد أن تنشئ هذه الجلسة عقود العميل.',
          ready: 'اكتمل الإعداد لإنشاء العقود والوصول إلى دعوات المقاول.',
        },
      },
      wallet: {
        walletLinkTitle: 'تهيئة محفظة المتصفح',
        walletLink: 'ربط المحفظة',
        browserWalletHeading: 'تهيئة محفظة المتصفح',
        connected: 'تم ربط محفظة المتصفح',
        unavailable: 'لم يتم العثور على محفظة متصفح',
        ready: 'محفظة المتصفح جاهزة للاتصال',
        chainUnknown: 'السلسلة غير معروفة',
        noActiveAccount: 'لا يوجد حساب نشط',
        connectWallet: 'اتصل بالمحفظة',
        linkWallet: 'اربط المحفظة المتصلة',
        eoaAddress: 'عنوان EOA',
        label: 'الاسم',
        chainId: 'معرّف السلسلة',
        fallbackHint:
          'استخدم أزرار المحفظة المدمجة للمسار الأصلي داخل المتصفح. ويظل مسار التحدي اليدوي متاحاً كخيار احتياطي للمحافظ التي لا توفر `personal_sign`.',
        createChallenge: 'إنشاء تحدي SIWE',
        issuedMessage: 'الرسالة الصادرة',
        walletSignature: 'توقيع المحفظة',
        verifyLinkedWallet: 'التحقق من المحفظة المرتبطة',
        provisioning: 'التهيئة',
        smartAccountTitle: 'محفظة تنفيذ الحساب الذكي',
        verifiedOwnerEoa: 'عنوان مالك EOA الموثق',
        executionLabel: 'اسم التنفيذ',
        provisionSmartAccount: 'تهيئة الحساب الذكي',
        smartAccountHint:
          'يتطلب الـ API محفظة مالك موثقة عبر SIWE قبل استخدام الحساب الذكي الممول لإنشاء العقود.',
      },
      composer: {
        title: 'صياغة موجهة لعقد العميل',
        steps: {
          scope: {
            label: 'النطاق',
            description: 'حدد العمل والفئة والنتيجة المتوقعة.',
          },
          counterparty: {
            label: 'الطرف المقابل',
            description: 'حدد محفظة العامل ووضع التسوية.',
          },
          plan: {
            label: 'الخطة',
            description: 'راجع المراحل والشروط التجارية وجهوزية الإطلاق.',
          },
        },
        targetExperience: 'التجربة المستهدفة',
        targetExperienceValue: 'إطلاق ضمان مُنتج',
        draftedMilestones: 'المراحل المصاغة',
        totalDraftedAmount: 'إجمالي المبلغ المصاغ',
        scopeHint:
          'اكتب النطاق أولاً بلغة الأعمال. سيقوم الـ API بتوليد الشروط من الخطة المنظمة أدناه.',
        jobTitle: 'عنوان العمل',
        projectSummary: 'ملخص المشروع',
        category: 'الفئة',
        contractorEmail: 'بريد المقاول',
        workerWallet: 'محفظة العامل',
        settlementTokenAddress: 'عنوان رمز التسوية',
        settlementAssetLabel: 'اسم أصل التسوية',
        settlementChain: 'سلسلة التسوية',
        executionWalletPosture: 'وضع محفظة التنفيذ',
        readyToCreateJobs: 'جاهز لإنشاء العقود',
        smartAccountRequired: 'الحساب الذكي مطلوب',
        counterpartyCheck: 'فحص الطرف المقابل',
        contractorIdentityCaptured: 'تم التقاط هوية المقاول',
        contractorIdentityIncomplete: 'هوية المقاول غير مكتملة',
        counterpartyHint:
          'يجب على المقاول الانضمام بهذا البريد وهذه المحفظة.',
        reviewWindowDays: 'نافذة المراجعة بالأيام',
        disputeModel: 'نموذج النزاع',
        evidenceExpectation: 'توقعات الإثبات',
        kickoffNote: 'ملاحظة البدء',
        commercialPlan: 'الخطة التجارية',
        readyMilestones: (count: number) => `${count} مراحل جاهزة`,
        contractorJoinHint: (email: string, wallet: string) =>
          `يتطلب الانضمام ${email || 'بريد المقاول المعلّق'} و ${wallet || 'محفظة العامل المربوطة'} من رابط العقد المشترك.`,
        totalDraftedMilestoneAmount: (count: number) =>
          `إجمالي مبلغ المراحل المصاغة: ${count || 0}`,
        back: 'السابق',
        next: 'التالي',
        createGuidedJob: 'إنشاء عقد موجه',
        jobCreated: 'تم إنشاء العقد',
        reviewSelectedJob: 'راجع العقد المحدد',
        commitDraftedMilestones: 'اعتماد المراحل المصاغة',
        stageFundingFromMilestoneTotal: 'تجهيز التمويل من إجمالي المراحل',
        milestoneDrafting: 'صياغة المراحل',
        addMilestone: 'إضافة مرحلة',
        commitMilestones: 'اعتماد المراحل',
        useDraftedMilestoneTotal: 'استخدم إجمالي المراحل المصاغة',
        checklistReady: 'جاهز',
        checklistPending: 'قيد الانتظار',
        checklist: {
          scopeDefined: 'تم تحديد النطاق',
          contractorEmailSet: 'تم تحديد بريد المقاول',
          workerWalletSet: 'تم تحديد محفظة العامل',
          settlementTokenSet: 'تم تحديد عنوان رمز التسوية',
          defaultWalletReady: 'محفظة التنفيذ الافتراضية هي حساب ذكي مهيأ',
          milestoneReady: 'هناك على الأقل مسودة مرحلة واحدة جاهزة',
        },
        categories: {
          'software-development': 'تطوير برمجيات',
          design: 'تصميم',
          marketing: 'تسويق',
          research: 'بحث',
          product: 'منتج',
          operations: 'عمليات',
        },
      },
      portfolio: {
        title: 'فهرس العقود',
        emptyTitle: 'لا توجد عقود متاحة',
        emptyMessage: 'لا توجد عقود متاحة بعد لهذه الهوية.',
      },
      selectedJob: {
        title: 'العقد المحدد',
        placeholder: 'اختر عقداً لإدارة إجراءات دورة الحياة',
        status: 'الحالة',
        fundedAmount: 'المبلغ الممول',
        escrowId: 'معرّف الضمان',
        updated: 'آخر تحديث',
        clientWallet: 'محفظة العميل',
        contractorWallet: 'محفظة المقاول',
        contractorJoin: 'انضمام المقاول',
        reviewWindow: 'نافذة المراجعة',
        disputeModel: 'نموذج النزاع',
        evidenceExpectation: 'توقعات الإثبات',
        operatorResolution: 'حسم المشغّل',
        contractorActivationTitle: 'تفعيل المقاول',
        operatorAudience: 'المشغّل',
        operatorTaskTitle: 'مهمة المشغّل',
        nextActionsTitle: 'الخطوات التالية',
        nextActionsCopy:
          'استخدم دور الجلسة الحالي ووضع المرحلة لنقل العقد المحدد إلى الخطوة التالية.',
        currentFocus: 'التركيز الحالي',
        contractorJoinAccess: 'إتاحة انضمام المقاول',
        pendingContractorEmail: 'بريد المقاول المعلّق',
        copyContractorLink: 'نسخ رابط المقاول',
        regenerateContractorLink: 'إعادة توليد الرابط',
        sendContractorInvite: 'إرسال دعوة بالبريد',
        resendContractorInvite: 'إعادة إرسال الدعوة',
        rotateAndResendContractorInvite: 'تبديل الرابط وإعادة الإرسال',
        updateContractorEmail: 'تحديث بريد المقاول',
        joinContract: 'الانضمام إلى العقد',
        noMilestonesTitle: 'لا توجد مراحل معتمدة بعد',
        noMilestonesMessage:
          'قم بتمويل العقد واعتماد نقاط المراحل قبل أن تبدأ إجراءات التسليم.',
        clientWorkspace: 'مساحة العميل',
        workerWorkspace: 'مساحة العامل',
        sharedDisputePosture: 'وضع النزاع المشترك',
        operatorPosture: 'وضع المشغّل',
        selectedMilestone: 'المرحلة المحددة',
        noMilestoneSelected: 'لا توجد مرحلة محددة',
        selectedMilestoneContext:
          'سياق مباشر لنقطة التحقق المركّز عليها الآن.',
        milestoneTimeline: 'الخط الزمني للمرحلة',
        milestoneAuditTrail: 'سجل تدقيق المرحلة',
        milestoneReceipts: 'إيصالات المرحلة',
        jobLaunchHistory: 'سجل إطلاق العقد',
        deliveryNote: 'ملاحظة التسليم',
        evidenceLinks: 'روابط الأدلة',
        disputeReason: 'سبب النزاع',
        disputeEvidenceLinks: 'روابط أدلة النزاع',
        resolution: 'الحسم',
        amount: 'المبلغ',
        due: 'الاستحقاق',
        noMilestoneContext:
          'اختر مرحلة معتمدة لمراجعة أدلة التسليم ووضع الإجراءات.',
        noMilestoneTimeline:
          'لا توجد أحداث زمنية مسجلة بعد للمرحلة المحددة.',
        noMilestoneAudit:
          'لا توجد أحداث تدقيق خاصة بهذه المرحلة بعد.',
        noMilestoneReceipts:
          'لا توجد إيصالات تنفيذ خاصة بهذه المرحلة بعد.',
        noJobAudit: 'لا توجد أحداث تدقيق على مستوى العقد بعد.',
        noJobReceipts: 'لا توجد إيصالات تنفيذ على مستوى العقد بعد.',
        selectJobMessage:
          'اختر عقداً من الفهرس لعرض المراحل وأحداث التدقيق والإيصالات.',
        clientWorkspaceCopy:
          'قم بتمويل الضمان واعتماد نقاط المراحل والإفراج عن العمل المقبول مع وضع إيصالات واضح.',
        workerWorkspaceCopy:
          'سلّم أدلة المرحلة مع وضع انتظار وتأكيد واضحين.',
        sharedDisputeCopy:
          'يجب أن يرى الطرفان المرحلة الحالية نفسها وحالتها وأدلة التصعيد.',
        operatorPostureCopy:
          'تدفقات المشغّل المميّزة لا تزال غير مكتملة. يظل الحسم متاحاً هنا فقط للجلسات التي تتحكم فعلياً بمحفظة المحكّم المهيأة.',
        operatorTaskWaitingSummary: 'توجد مرحلة متنازع عليها بانتظار إجراء المحكّم.',
        operatorTaskWaitingDetail:
          'إذا ظلت هذه المرحلة متنازعاً عليها، يمكن لمحفظة المحكّم المهيأة حسمها من لوحة المشغّل.',
        operatorTaskIdleSummary: 'لا يوجد إجراء مطلوب من المشغّل حالياً.',
        operatorTaskIdleDetail:
          'تصبح مراجعة المشغّل ذات صلة فقط عندما يصعّد أحد المشاركين المرحلة المحددة إلى نزاع.',
      },
      actions: {
        fundSelectedJob: 'تمويل العقد المحدد',
        releaseSelectedMilestone: 'الإفراج عن المرحلة المحددة',
        deliverSelectedMilestone: 'تسليم المرحلة المحددة',
        openDispute: 'فتح نزاع',
        resolveDispute: 'حسم النزاع',
        resolutionAction: 'إجراء الحسم',
        resolutionNote: 'ملاحظة الحسم',
        disputeEvidenceUrls: 'روابط أدلة النزاع',
        evidenceUrls: 'روابط الأدلة',
        fundAmount: 'مبلغ التمويل',
      },
      emptyStates: {
        contractorWalletRequired: 'محفظة المقاول مطلوبة',
        clientWalletRequired: 'محفظة العميل مطلوبة',
      },
      labels: {
        runtimeProfile: {
          'deployment-like': 'مشابه للنشر',
          'local-mock': 'محلي تجريبي',
          mixed: 'مختلط',
        },
        lifecyclePhase: {
          ready: 'جاهز',
          pending: 'قيد التنفيذ',
          confirmed: 'مؤكد',
          failed: 'فشل',
          blocked: 'محجوب',
        },
        jobStatus: {
          draft: 'مسودة',
          funded: 'ممول',
          in_progress: 'قيد التنفيذ',
          completed: 'مكتمل',
          disputed: 'متنازع عليه',
          resolved: 'محسوم',
        },
        milestoneStatus: {
          pending: 'قيد الانتظار',
          delivered: 'تم التسليم',
          released: 'تم الإفراج',
          disputed: 'متنازع عليها',
          refunded: 'تم الاسترداد',
        },
        contractorParticipation: {
          pending: 'قيد الانتظار',
          joined: 'تم الانضمام',
        },
        role: {
          client: 'عميل',
          worker: 'عامل',
          observer: 'مراقب',
        },
        resolutionAction: {
          release: 'إفراج',
          refund: 'استرداد',
        },
      },
      messages: {
        joinAccessSignedOut: (emailHint: string | null) =>
          `سجّل الدخول باستخدام ${emailHint || 'بريد المقاول المدعو'} من رابط الدعوة هذا قبل محاولة الانضمام إلى العقد.`,
        joinAccessJoined:
          'تم بالفعل الانضمام إلى هذا العقد بواسطة هوية المقاول المحددة.',
        joinAccessWrongEmail: (emailHint: string | null) =>
          `هذه الجلسة مسجلة ببريد خاطئ. استخدم ${emailHint || 'بريد المقاول المدعو'} من دعوة المقاول.`,
        joinAccessInviteRequired:
          'هذه الصفحة لا تحتوي على رمز دعوة مقاول صالح. اطلب من العميل إعادة إرسال أو نسخ رابط دعوة جديد.',
        joinAccessInviteInvalid:
          'رابط دعوة المقاول هذا لم يعد صالحاً. اطلب من العميل إعادة توليده وإرساله.',
        joinAccessClaimed:
          'تم بالفعل المطالبة بهذا العقد بواسطة هوية مقاول مختلفة.',
        joinAccessWalletNotLinked: (wallet: string) =>
          `اربط ${wallet} قبل الانضمام إلى هذا العقد.`,
        joinAccessWrongWallet: (wallet: string) =>
          `تحتوي هذه الجلسة على محافظ مرتبطة، لكنها لا تشمل محفظة العامل المحددة ${wallet}.`,
        joinAccessReady:
          'تتحكم هذه الجلسة بمحفظة العامل المحددة وهي جاهزة للانضمام.',
        deliveryRequiresWallet: (wallet: string) =>
          `اربط ${wallet} قبل تسليم هذه المرحلة.`,
        disputeRequiresWallet: (wallet: string) =>
          `اربط ${wallet} قبل فتح نزاع على هذه المرحلة.`,
        clientRoleRefresh:
          'تتحكم هذه الجلسة بمحفظة العميل، لكن قائمة العقود لم تتحدث بعد إلى دور عميل قابل للكتابة.',
        signInForDelivery:
          'سجّل الدخول واربط محفظة المقاول المطابقة من الرابط المشترك قبل تفعيل التسليم.',
        signInForDispute:
          'سجّل الدخول واربط محفظة العميل المطابقة من الرابط المشترك قبل تفعيل النزاع.',
        onlyClientCanDispute:
          'فقط محفظة العميل يمكنها فتح نزاع في هذا المسار.',
        shariahModeUpdated: (enabled: boolean) =>
          `وضع الشريعة ${enabled ? 'مفعّل' : 'غير مفعّل'}.`,
      },
      lifecycle: {
        submitting: 'جارٍ الإرسال',
        waitingForApiConfirmation: 'بانتظار تأكيد آخر طلب من الـ API.',
        blocked: 'محجوب',
        retryNeeded: 'تحتاج إلى إعادة المحاولة',
        fundingConfirmedSummary: 'تم تأكيد التمويل',
        fundingConfirmedDetail: (fundedAmount: string | null) =>
          `تم تمويل الضمان بمبلغ ${fundedAmount ?? 'المبلغ المطلوب'} وأصبح جاهزاً لإعداد المراحل.`,
        readyToFundSummary: 'جاهز للتمويل',
        readyToFundDetail:
          'أرسل تمويل الضمان قبل اعتماد المراحل على السلسلة.',
        commitMilestonesTitle: 'اعتماد المراحل',
        fundEscrowTitle: 'تمويل الضمان',
        milestonesCommittedSummary: 'تم اعتماد المراحل',
        milestonesCommittedDetail: (count: number) =>
          `تم تسجيل ${count} مرحلة لهذا العقد.`,
        fundingRequiredBeforeMilestones:
          'يجب تأكيد التمويل قبل اعتماد المراحل.',
        readyToCommitSummary: 'جاهز للاعتماد',
        readyToCommitDetail:
          'اعتمد المراحل المصاغة ليتمكن العامل من التسليم وفق نقاط تحقق مسماة.',
        commitMilestonesFirst:
          'اعتمد المراحل أولاً. لا توجد مرحلة نشطة لإدارتها بعد.',
        selectValidMilestone: 'اختر مرحلة صحيحة للمتابعة.',
        workerDeliveryTitle: 'تسليم العامل',
        deliveryRecordedSummary: 'تم تسجيل التسليم',
        deliveryRecordedDetail:
          'قام العامل بإرسال المخرجات والأدلة للمراجعة.',
        pendingMilestonesOnly: 'يمكن تسليم المراحل المعلقة فقط.',
        readyForDeliverySummary: 'جاهز للتسليم',
        readyForDeliveryDetail:
          'أرسل ملاحظة التسليم وروابط الأدلة للمرحلة المحددة.',
        clientReleaseTitle: 'إفراج العميل',
        releasedSummary: 'تم الإفراج',
        releasedDetail: 'وافق العميل على المرحلة وتم الإفراج عن الدفعة.',
        resolveInsteadOfRelease:
          'هذه المرحلة متنازع عليها. قم بحسم النزاع بدلاً من الإفراج المباشر.',
        alreadyRefunded: 'تم استرداد هذه المرحلة بالفعل.',
        deliveredOnlyForRelease: 'يمكن الإفراج عن المراحل المسلّمة فقط.',
        readyForReleaseSummary: 'جاهز للإفراج',
        readyForReleaseDetail:
          'أفرج عن الدفعة بعد قبول ملاحظة التسليم والأدلة.',
        openDisputeTitle: 'فتح نزاع',
        disputeOpenedSummary: 'تم فتح النزاع',
        disputeOpenedDetail: 'تم تصعيد المرحلة للحسم.',
        alreadyReleased: 'تم الإفراج عن هذه المرحلة بالفعل.',
        deliveredOnlyForDispute: 'يمكن النزاع على المراحل المسلّمة فقط.',
        readyToDisputeSummary: 'جاهز للنزاع',
        readyToDisputeDetail:
          'صعّد المرحلة المسلّمة المحددة إذا كان التسليم محل اعتراض.',
        resolveDisputeTitle: 'حسم النزاع',
        resolutionRecordedSummary: 'تم تسجيل الحسم',
        resolutionRecordedDetail: (action: string) => `تم الحسم عبر ${action}.`,
        resolutionRecordedFallback: 'تم حسم النزاع.',
        disputedOnlyForResolution: 'يمكن حسم المراحل المتنازع عليها فقط.',
        readyToResolveSummary: 'جاهز للحسم',
        readyToResolveDetail:
          'يجب استخدام حسم المشغّل فقط عندما تتحكم المحفظة الفاعلة في حساب المحكّم المهيأ.',
        timelineDue: 'الاستحقاق',
        timelineDueDetail: 'نقطة التسليم المستهدفة',
        timelineDelivered: 'تم التسليم',
        timelineDeliveredDetail: 'تم إرسال ملاحظة التسليم والأدلة للمراجعة.',
        timelineDisputed: 'تم النزاع',
        timelineDisputedDetail: 'تم تصعيد التسليم لمراجعة المشغّل.',
        timelineResolved: 'تم الحسم',
        timelineResolvedDetail: (action: string) => `تم الحسم عبر ${action}.`,
        timelineReleased: 'تم الإفراج',
        timelineReleasedDetail: 'تم تحويل الدفعة إلى العامل.',
      },
    },
  },
} as const;

export type WebMessages = (typeof webMessages)[typeof defaultLocale];
type WebLocaleContextValue = LocaleContextValue<WebMessages>;

const WebI18nContext = createContext<WebLocaleContextValue | null>(null);

export function getWebMessages(locale: SupportedLocale): WebMessages {
  return webMessages[locale];
}

export function WebI18nProvider(props: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const { children, initialLocale = defaultLocale } = props;
  const [locale, setLocale] = useState<SupportedLocale>(
    resolveSupportedLocale(initialLocale),
  );

  useEffect(() => {
    syncDocumentLocale(locale);
    persistLocaleCookie(locale);
  }, [locale]);

  const value = useMemo<WebLocaleContextValue>(() => {
    const resolvedLocale = resolveSupportedLocale(locale);

    return {
      locale: resolvedLocale,
      definition: getLocaleDefinition(resolvedLocale),
      messages: getWebMessages(resolvedLocale),
      setLocale,
    };
  }, [locale]);

  return (
    <WebI18nContext.Provider value={value}>{children}</WebI18nContext.Provider>
  );
}

export function useWebI18n() {
  const value = useContext(WebI18nContext);

  if (!value) {
    throw new Error('useWebI18n must be used within WebI18nProvider.');
  }

  return value;
}
