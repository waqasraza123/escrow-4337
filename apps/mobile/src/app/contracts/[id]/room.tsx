import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import {
  formatAmount,
  formatTimestamp,
  previewHash,
  type JobMilestone,
  type MarketplaceReview,
  type MarketplaceReviewScores,
  type ProductStatusTone,
  type ProjectActivity,
  type ProjectArtifact,
  type ProjectMessage,
  type ProjectSubmission,
  type SupportCase,
  type SupportCaseReason,
  type SupportCaseSeverity,
} from '@escrow4334/product-core';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Field,
  HashText,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  Textarea,
} from '@/ui/primitives';

const supportReasonOptions: Array<{ label: string; value: SupportCaseReason }> = [
  { label: 'General help', value: 'general_help' },
  { label: 'Fee question', value: 'fee_question' },
  { label: 'Fee exception', value: 'fee_exception' },
  { label: 'Funding stuck', value: 'stuck_funding' },
  { label: 'Dispute follow-up', value: 'dispute_followup' },
  { label: 'Release delay', value: 'release_delay' },
];

const reviewScoreOptions = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
];

type ReviewScoreKey = keyof MarketplaceReviewScores;

type ReviewScoreDraft = Record<ReviewScoreKey, string>;

type ProjectArtifactDraft = {
  label: string;
  url: string;
  sha256: string;
  mimeType: string | null;
  byteSize: number | null;
};

function splitNonEmptyLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseArtifactLines(value: string): ProjectArtifactDraft[] {
  const lines = splitNonEmptyLines(value);
  if (lines.length > 10) {
    throw new Error('Attach at most 10 artifacts for one milestone submission.');
  }

  return lines.map((line) => {
    const [label, url, sha256, mimeType, byteSize] = line
      .split('|')
      .map((part) => part.trim());

    if (!label || !url || !sha256) {
      throw new Error('Each artifact line must include label | url | sha256.');
    }

    const parsedByteSize = byteSize ? Number(byteSize) : null;
    if (
      parsedByteSize !== null &&
      (!Number.isFinite(parsedByteSize) || parsedByteSize < 0 || !Number.isInteger(parsedByteSize))
    ) {
      throw new Error('Artifact byte size must be a non-negative integer.');
    }

    return {
      label,
      url,
      sha256,
      mimeType: mimeType || null,
      byteSize: parsedByteSize,
    };
  });
}

function submissionStatusTone(status: ProjectSubmission['status']): ProductStatusTone {
  switch (status) {
    case 'approved':
    case 'delivered':
      return 'success';
    case 'revision_requested':
      return 'warning';
    case 'submitted':
    default:
      return 'info';
  }
}

function milestoneStatusTone(status: JobMilestone['status']): ProductStatusTone {
  switch (status) {
    case 'released':
      return 'success';
    case 'delivered':
      return 'info';
    case 'disputed':
      return 'danger';
    case 'refunded':
      return 'warning';
    case 'pending':
    default:
      return 'muted';
  }
}

function roleLabel(roles: Array<'client' | 'worker'>) {
  if (roles.length === 2) {
    return 'client + worker';
  }

  return roles[0] ?? 'participant';
}

function sortRecent<T extends { createdAt: number }>(items: T[]) {
  return [...items].sort((left, right) => right.createdAt - left.createdAt);
}

function sortRecentActivity(items: ProjectActivity[]) {
  return [...items].sort((left, right) => right.createdAt - left.createdAt);
}

function sortRecentSupportCases(items: SupportCase[]) {
  return [...items].sort((left, right) => right.openedAt - left.openedAt);
}

function normalizeReviewScores(scores: ReviewScoreDraft): MarketplaceReviewScores {
  return {
    scopeClarity: Number(scores.scopeClarity),
    communication: Number(scores.communication),
    timeliness: Number(scores.timeliness),
    outcomeQuality: Number(scores.outcomeQuality),
  };
}

function SupportCaseList({
  supportCases,
  selectedCaseId,
  onSelect,
}: {
  supportCases: SupportCase[];
  selectedCaseId: string;
  onSelect: (caseId: string) => void;
}) {
  const recentSupportCases = sortRecentSupportCases(supportCases).slice(0, 5);

  if (!recentSupportCases.length) {
    return <BodyText>No support cases have been opened for this project room.</BodyText>;
  }

  return (
    <View style={styles.stack}>
      {recentSupportCases.map((supportCase) => {
        const selected = supportCase.id === selectedCaseId;
        return (
          <View key={supportCase.id} style={styles.threadItem}>
            <View style={styles.headerRow}>
              <StatusBadge
                label={supportCase.status.replace(/_/g, ' ')}
                tone={supportCase.status === 'resolved' ? 'success' : 'warning'}
              />
              <StatusBadge label={supportCase.severity} tone="muted" />
            </View>
            <Heading size="section">{supportCase.subject}</Heading>
            <MetricRow label="Reason" value={supportCase.reason.replace(/_/g, ' ')} />
            <MetricRow label="Opened" value={formatTimestamp(supportCase.openedAt)} />
            <MetricRow label="Messages" value={supportCase.messages.length} />
            <BodyText numberOfLines={3}>{supportCase.description}</BodyText>
            {supportCase.ownerEmail ? (
              <MetricRow label="Owner" value={supportCase.ownerEmail} />
            ) : null}
            <SecondaryButton onPress={() => onSelect(supportCase.id)}>
              {selected ? 'Selected case' : 'Reply to case'}
            </SecondaryButton>
          </View>
        );
      })}
    </View>
  );
}

function ArtifactList({ artifacts }: { artifacts: ProjectArtifact[] }) {
  if (!artifacts.length) {
    return <BodyText>No artifacts attached.</BodyText>;
  }

  return (
    <View style={styles.stack}>
      {artifacts.map((artifact) => (
        <View key={artifact.id} style={styles.artifactRow}>
          <Heading size="section">{artifact.label}</Heading>
          <HashText value={artifact.sha256} />
          <BodyText>
            {artifact.mimeType ?? 'external_url'}
            {artifact.byteSize !== null ? ` - ${artifact.byteSize} bytes` : ''}
          </BodyText>
          <SecondaryButton onPress={() => void Linking.openURL(artifact.url)}>
            Open artifact
          </SecondaryButton>
        </View>
      ))}
    </View>
  );
}

function SubmissionSummary({ submission }: { submission: ProjectSubmission }) {
  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <Heading size="section">Latest submission</Heading>
        <StatusBadge
          label={submission.status.replace(/_/g, ' ')}
          tone={submissionStatusTone(submission.status)}
        />
      </View>
      <MetricRow label="Submitted by" value={submission.submittedBy.email} />
      <MetricRow label="Submitted" value={formatTimestamp(submission.createdAt)} />
      <BodyText>{submission.note}</BodyText>
      <ArtifactList artifacts={submission.artifacts} />
      {submission.revisionRequest ? (
        <View style={styles.noticeBlock}>
          <Heading size="section">Revision request</Heading>
          <BodyText>{submission.revisionRequest.note}</BodyText>
          <MetricRow
            label="Requested by"
            value={submission.revisionRequest.requestedByEmail}
          />
          <MetricRow
            label="Requested"
            value={formatTimestamp(submission.revisionRequest.requestedAt)}
          />
        </View>
      ) : null}
      {submission.approval ? (
        <View style={styles.noticeBlock}>
          <Heading size="section">Approval</Heading>
          <BodyText>{submission.approval.note || 'Approved without additional notes.'}</BodyText>
          <MetricRow label="Approved by" value={submission.approval.approvedByEmail} />
          <MetricRow label="Approved" value={formatTimestamp(submission.approval.approvedAt)} />
        </View>
      ) : null}
    </View>
  );
}

function MessageList({ messages }: { messages: ProjectMessage[] }) {
  const recentMessages = sortRecent(messages).slice(0, 6);

  if (!recentMessages.length) {
    return <BodyText>No room messages yet.</BodyText>;
  }

  return (
    <View style={styles.stack}>
      {recentMessages.map((message) => (
        <View key={message.id} style={styles.threadItem}>
          <View style={styles.headerRow}>
            <StatusBadge
              label={message.senderRole}
              tone={message.senderRole === 'client' ? 'info' : 'success'}
            />
            <BodyText>{formatTimestamp(message.createdAt)}</BodyText>
          </View>
          <MetricRow label="Sender" value={message.sender.email} />
          <BodyText>{message.body}</BodyText>
        </View>
      ))}
    </View>
  );
}

function ActivityList({ activity }: { activity: ProjectActivity[] }) {
  const recentActivity = sortRecentActivity(activity).slice(0, 8);

  if (!recentActivity.length) {
    return <BodyText>No project-room activity has been recorded yet.</BodyText>;
  }

  return (
    <View style={styles.stack}>
      {recentActivity.map((item) => (
        <View key={`${item.source}:${item.id}`} style={styles.threadItem}>
          <View style={styles.headerRow}>
            <StatusBadge label={item.source} tone={item.source === 'audit' ? 'muted' : 'info'} />
            <BodyText>{formatTimestamp(item.createdAt)}</BodyText>
          </View>
          <Heading size="section">{item.summary}</Heading>
          {item.detail ? <BodyText>{item.detail}</BodyText> : null}
          {item.milestoneIndex !== null ? (
            <MetricRow label="Milestone" value={item.milestoneIndex + 1} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ReviewList({ reviews }: { reviews: MarketplaceReview[] }) {
  if (!reviews.length) {
    return <BodyText>No marketplace reviews have been captured for this contract yet.</BodyText>;
  }

  return (
    <View style={styles.stack}>
      {reviews.slice(0, 6).map((review) => (
        <View key={review.id} style={styles.threadItem}>
          <View style={styles.headerRow}>
            <StatusBadge label={`${review.rating}/5`} tone="success" />
            <StatusBadge label={review.reviewerRole} tone="muted" />
          </View>
          <Heading size="section">{review.headline || 'Marketplace review'}</Heading>
          {review.body ? <BodyText>{review.body}</BodyText> : null}
          <MetricRow label="Reviewer" value={review.reviewer.displayName} />
          <MetricRow label="Created" value={formatTimestamp(review.createdAt)} />
        </View>
      ))}
    </View>
  );
}

function ScoreControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.stack}>
      <BodyText>{label}</BodyText>
      <SegmentedControl value={value} onChange={onChange} options={reviewScoreOptions} />
    </View>
  );
}

export default function ContractProjectRoomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [selectedMilestoneValue, setSelectedMilestoneValue] = useState('0');
  const [submissionNote, setSubmissionNote] = useState('');
  const [artifactLines, setArtifactLines] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [supportReason, setSupportReason] = useState<SupportCaseReason>('general_help');
  const [supportSeverity, setSupportSeverity] = useState<SupportCaseSeverity>('routine');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [supportReply, setSupportReply] = useState('');
  const [selectedSupportCaseId, setSelectedSupportCaseId] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewScores, setReviewScores] = useState<ReviewScoreDraft>({
    scopeClarity: '5',
    communication: '5',
    timeliness: '5',
    outcomeQuality: '5',
  });
  const [reviewHeadline, setReviewHeadline] = useState('');
  const [reviewBody, setReviewBody] = useState('');

  const roomQuery = useQuery({
    enabled: Boolean(accessToken && id),
    queryKey: ['project-room', id],
    queryFn: () => api.getProjectRoom(id as string, accessToken as string),
  });

  const reviewsQuery = useQuery({
    enabled: Boolean(accessToken && id),
    queryKey: ['marketplace-job-reviews', id],
    queryFn: () => api.getMarketplaceJobReviews(id as string, accessToken as string),
  });

  const room = roomQuery.data?.room ?? null;
  const job = room?.job ?? null;
  const participantRoles = room?.participantRoles ?? [];
  const reviews = reviewsQuery.data?.reviews ?? [];
  const selectedMilestoneIndex = Number(selectedMilestoneValue);
  const selectedMilestone = job?.milestones[selectedMilestoneIndex] ?? null;
  const selectedSubmissions = useMemo(
    () =>
      room
        ? sortRecent(
            room.submissions.filter(
              (submission) => submission.milestoneIndex === selectedMilestoneIndex,
            ),
          )
        : [],
    [room, selectedMilestoneIndex],
  );
  const latestSubmission = selectedSubmissions[0] ?? null;
  const isClient = participantRoles.includes('client');
  const isWorker = participantRoles.includes('worker');
  const canSubmit =
    isWorker &&
    selectedMilestone?.status === 'pending' &&
    (!latestSubmission || latestSubmission.status === 'revision_requested');
  const canReview =
    isClient &&
    selectedMilestone?.status === 'pending' &&
    latestSubmission !== null &&
    (latestSubmission.status === 'submitted' ||
      latestSubmission.status === 'revision_requested');
  const canDeliverApproved =
    isWorker &&
    selectedMilestone?.status === 'pending' &&
    latestSubmission?.status === 'approved';
  const canLeaveReview =
    Boolean(job && user) &&
    (job?.status === 'completed' || job?.status === 'resolved') &&
    participantRoles.length > 0 &&
    !reviews.some((review) => review.reviewer.userId === user?.id);
  const selectedSupportCase =
    room?.supportCases.find((supportCase) => supportCase.id === selectedSupportCaseId) ??
    room?.supportCases.find((supportCase) => supportCase.status !== 'resolved') ??
    room?.supportCases[0] ??
    null;

  useEffect(() => {
    if (!job?.milestones.length) {
      setSelectedMilestoneValue('0');
      return;
    }

    if (selectedMilestoneIndex >= job.milestones.length) {
      setSelectedMilestoneValue('0');
    }
  }, [job?.milestones.length, selectedMilestoneIndex]);

  async function refreshRoom() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-room', id] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    ]);
  }

  async function refreshReviews() {
    await queryClient.invalidateQueries({ queryKey: ['marketplace-job-reviews', id] });
  }

  function updateReviewScore(key: ReviewScoreKey, value: string) {
    setReviewScores((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const submitMilestone = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !selectedMilestone) {
        throw new Error('Open a participant-scoped room before submitting work.');
      }
      if (!submissionNote.trim()) {
        throw new Error('Add a submission note before posting work.');
      }
      networkGate.requireOnline('Posting a milestone submission');

      return api.submitProjectMilestone(
        job.id,
        selectedMilestoneIndex,
        {
          note: submissionNote.trim(),
          artifacts: parseArtifactLines(artifactLines),
        },
        accessToken,
      );
    },
    onSuccess: async () => {
      setSubmissionNote('');
      setArtifactLines('');
      await refreshRoom();
      Alert.alert('Submission posted', 'The milestone submission is ready for client review.');
    },
    onError: (error) => {
      Alert.alert(
        'Submission failed',
        error instanceof Error ? error.message : 'The milestone submission could not be posted.',
      );
    },
  });

  const requestRevision = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !latestSubmission) {
        throw new Error('Select a submitted milestone before requesting revisions.');
      }
      if (!revisionNote.trim()) {
        throw new Error('Add a revision request note.');
      }
      networkGate.requireOnline('Requesting a project-room revision');

      return api.requestProjectRevision(
        job.id,
        latestSubmission.id,
        { note: revisionNote.trim() },
        accessToken,
      );
    },
    onSuccess: async () => {
      setRevisionNote('');
      await refreshRoom();
      Alert.alert('Revision requested', 'The worker can now post an updated submission.');
    },
    onError: (error) => {
      Alert.alert(
        'Revision request failed',
        error instanceof Error ? error.message : 'The revision request could not be posted.',
      );
    },
  });

  const approveSubmission = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !latestSubmission) {
        throw new Error('Select a submitted milestone before approving it.');
      }
      networkGate.requireOnline('Approving a project-room submission');

      return api.approveProjectSubmission(
        job.id,
        latestSubmission.id,
        { note: approvalNote.trim() || null },
        accessToken,
      );
    },
    onSuccess: async () => {
      setApprovalNote('');
      await refreshRoom();
      Alert.alert('Submission approved', 'The worker can now deliver it onchain.');
    },
    onError: (error) => {
      Alert.alert(
        'Approval failed',
        error instanceof Error ? error.message : 'The submission could not be approved.',
      );
    },
  });

  const deliverApproved = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !latestSubmission) {
        throw new Error('Select an approved milestone submission before delivery.');
      }
      networkGate.requireOnline('Delivering an approved submission');

      return api.deliverProjectSubmission(job.id, latestSubmission.id, accessToken);
    },
    onSuccess: async (response) => {
      await refreshRoom();
      Alert.alert('Delivery submitted', `Transaction ${previewHash(response.txHash)} was recorded.`);
    },
    onError: (error) => {
      Alert.alert(
        'Delivery failed',
        error instanceof Error ? error.message : 'The approved submission could not be delivered.',
      );
    },
  });

  const postMessage = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job) {
        throw new Error('Open a participant-scoped room before posting a message.');
      }
      if (!messageBody.trim()) {
        throw new Error('Write a message before posting.');
      }
      networkGate.requireOnline('Posting a project-room message');

      return api.postProjectRoomMessage(job.id, { body: messageBody.trim() }, accessToken);
    },
    onSuccess: async () => {
      setMessageBody('');
      await refreshRoom();
      Alert.alert('Message posted', 'The project room message was recorded.');
    },
    onError: (error) => {
      Alert.alert(
        'Message failed',
        error instanceof Error ? error.message : 'The project room message could not be posted.',
      );
    },
  });

  const createSupportCase = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job) {
        throw new Error('Open a participant-scoped room before requesting support.');
      }
      if (!supportSubject.trim()) {
        throw new Error('Add a support subject.');
      }
      if (!supportDescription.trim()) {
        throw new Error('Describe the support request.');
      }
      networkGate.requireOnline('Opening a support case');

      return api.createSupportCase(
        job.id,
        {
          reason: supportReason,
          severity: supportSeverity,
          milestoneIndex: selectedMilestone ? selectedMilestoneIndex : null,
          subject: supportSubject.trim(),
          description: supportDescription.trim(),
        },
        accessToken,
      );
    },
    onSuccess: async (response) => {
      setSupportSubject('');
      setSupportDescription('');
      setSelectedSupportCaseId(response.supportCase.id);
      await refreshRoom();
      Alert.alert('Support case opened', 'The support request is now attached to this room.');
    },
    onError: (error) => {
      Alert.alert(
        'Support request failed',
        error instanceof Error ? error.message : 'The support case could not be opened.',
      );
    },
  });

  const postSupportReply = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !selectedSupportCase) {
        throw new Error('Select a support case before replying.');
      }
      if (!supportReply.trim()) {
        throw new Error('Write a support reply before posting.');
      }
      networkGate.requireOnline('Posting a support reply');

      return api.postSupportCaseMessage(
        job.id,
        selectedSupportCase.id,
        { body: supportReply.trim(), visibility: 'external' },
        accessToken,
      );
    },
    onSuccess: async () => {
      setSupportReply('');
      await refreshRoom();
      Alert.alert('Support reply posted', 'The support case was updated.');
    },
    onError: (error) => {
      Alert.alert(
        'Support reply failed',
        error instanceof Error ? error.message : 'The support reply could not be posted.',
      );
    },
  });

  const createReview = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job) {
        throw new Error('Open a participant-scoped room before leaving a review.');
      }
      if (!reviewBody.trim()) {
        throw new Error('Add review body copy before submitting.');
      }
      networkGate.requireOnline('Submitting a marketplace review');

      return api.createMarketplaceJobReview(
        job.id,
        {
          rating: Number(reviewRating),
          scores: normalizeReviewScores(reviewScores),
          headline: reviewHeadline.trim() || null,
          body: reviewBody.trim(),
        },
        accessToken,
      );
    },
    onSuccess: async () => {
      setReviewHeadline('');
      setReviewBody('');
      setReviewRating('5');
      setReviewScores({
        scopeClarity: '5',
        communication: '5',
        timeliness: '5',
        outcomeQuality: '5',
      });
      await refreshReviews();
      Alert.alert('Review submitted', 'The marketplace review was recorded.');
    },
    onError: (error) => {
      Alert.alert(
        'Review failed',
        error instanceof Error ? error.message : 'The marketplace review could not be posted.',
      );
    },
  });

  if (!accessToken) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Project room"
          title="Sign in required"
          body="Project rooms are only available to authenticated contract participants."
        />
        <EmptyState
          title="Signed out"
          body="Sign in to review milestone submissions, approvals, and room messages."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  if (roomQuery.isLoading) {
    return (
      <ScrollScreen>
        <SectionHeader eyebrow="Project room" title="Loading room" />
        <SurfaceCard animated>
          <BodyText>Loading milestone review state...</BodyText>
        </SurfaceCard>
      </ScrollScreen>
    );
  }

  if (roomQuery.isError) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Project room"
          title="Room unavailable"
          body="The project room could not be reached for this participant session."
        />
        <EmptyState
          title="Try again later"
          body="Return to contract detail once the backend target is reachable."
          action={<PrimaryButton onPress={() => router.back()}>Back to contract</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  if (!room || !job) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Project room"
          title="Room not found"
          body="This contract room is not visible to the current authenticated account."
        />
        <EmptyState
          title="No participant access"
          body="Return to the contracts list and select a contract tied to your account."
          action={<PrimaryButton onPress={() => router.replace('/contracts')}>Contracts</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Project room"
        title={job.title}
        body="Review milestone submissions before onchain delivery, then continue through release or dispute from contract detail."
      />

      <SurfaceCard animated variant="elevated">
        <View style={styles.headerRow}>
          <StatusBadge label={job.status} tone={job.status === 'completed' ? 'success' : 'info'} />
          <StatusBadge label={roleLabel(participantRoles)} tone="muted" />
        </View>
        <MetricRow label="Funded" value={formatAmount(job.fundedAmount)} />
        <MetricRow label="Messages" value={room.messages.length} />
        <MetricRow label="Submissions" value={room.submissions.length} />
        <MetricRow
          label="Open support cases"
          value={room.supportCases.filter((item) => item.status !== 'resolved').length}
        />
      </SurfaceCard>

      <SurfaceCard animated delay={60}>
        <Heading size="section">Milestone review</Heading>
        {job.milestones.length ? (
          <>
            <SegmentedControl
              value={selectedMilestoneValue}
              onChange={setSelectedMilestoneValue}
              options={job.milestones.map((milestone, index) => ({
                label: `${index + 1}. ${milestone.title || 'Milestone'}`,
                value: String(index),
              }))}
            />
            {selectedMilestone ? (
              <View style={styles.stack}>
                <View style={styles.headerRow}>
                  <Heading size="section">{selectedMilestone.title}</Heading>
                  <StatusBadge
                    label={selectedMilestone.status}
                    tone={milestoneStatusTone(selectedMilestone.status)}
                  />
                </View>
                <MetricRow label="Amount" value={formatAmount(selectedMilestone.amount)} />
                <MetricRow label="Due" value={formatTimestamp(selectedMilestone.dueAt)} />
                <BodyText>{selectedMilestone.deliverable}</BodyText>
              </View>
            ) : null}
          </>
        ) : (
          <BodyText>Commit contract milestones before using the project room.</BodyText>
        )}
      </SurfaceCard>

      {canSubmit ? (
        <SurfaceCard animated delay={90}>
          <Heading size="section">Submit work</Heading>
          <BodyText>
            Attach artifact metadata as one line per artifact using label | url | sha256 |
            mimeType | byteSize. The hash and URL are recorded for client review before onchain
            delivery.
          </BodyText>
          <Textarea
            label="Submission note"
            onChangeText={setSubmissionNote}
            placeholder="Summarize what changed, where to review it, and acceptance notes"
            value={submissionNote}
          />
          <Textarea
            autoCapitalize="none"
            label="Artifacts"
            onChangeText={setArtifactLines}
            placeholder="Landing page | https://example.com/review | 64-char sha256"
            value={artifactLines}
          />
          <PrimaryButton
            disabled={
              networkGate.actionBlocked || submitMilestone.isPending || !submissionNote.trim()
            }
            loading={submitMilestone.isPending}
            onPress={() => submitMilestone.mutate()}
          >
            Post submission
          </PrimaryButton>
        </SurfaceCard>
      ) : null}

      <SurfaceCard animated delay={120}>
        {latestSubmission ? (
          <SubmissionSummary submission={latestSubmission} />
        ) : (
          <>
            <Heading size="section">Latest submission</Heading>
            <BodyText>No submission has been posted for this milestone yet.</BodyText>
          </>
        )}
      </SurfaceCard>

      {canReview ? (
        <SurfaceCard animated delay={150}>
          <Heading size="section">Client review</Heading>
          <Textarea
            label="Revision note"
            onChangeText={setRevisionNote}
            placeholder="What must change before approval"
            value={revisionNote}
          />
          <SecondaryButton
            disabled={
              networkGate.actionBlocked || requestRevision.isPending || !revisionNote.trim()
            }
            onPress={() => requestRevision.mutate()}
          >
            Request revision
          </SecondaryButton>
          <Textarea
            label="Approval note"
            onChangeText={setApprovalNote}
            placeholder="Optional acceptance note"
            value={approvalNote}
          />
          <PrimaryButton
            disabled={networkGate.actionBlocked || approveSubmission.isPending}
            loading={approveSubmission.isPending}
            onPress={() => approveSubmission.mutate()}
          >
            Approve submission
          </PrimaryButton>
        </SurfaceCard>
      ) : null}

      {canDeliverApproved ? (
        <SurfaceCard animated delay={180}>
          <Heading size="section">Approved delivery</Heading>
          <BodyText>
            Deliver the approved submission onchain. The backend reuses the approved note and
            artifact URLs as milestone delivery evidence.
          </BodyText>
          <PrimaryButton
            disabled={networkGate.actionBlocked || deliverApproved.isPending}
            loading={deliverApproved.isPending}
            onPress={() => deliverApproved.mutate()}
          >
            Deliver approved submission
          </PrimaryButton>
        </SurfaceCard>
      ) : null}

      <SurfaceCard animated delay={210}>
        <Heading size="section">Room messages</Heading>
        <Textarea
          label="Message"
          onChangeText={setMessageBody}
          placeholder="Coordinate delivery review, blockers, or acceptance details"
          value={messageBody}
        />
        <PrimaryButton
          disabled={networkGate.actionBlocked || postMessage.isPending || !messageBody.trim()}
          loading={postMessage.isPending}
          onPress={() => postMessage.mutate()}
        >
          Post message
        </PrimaryButton>
        <MessageList messages={room.messages} />
      </SurfaceCard>

      <SurfaceCard animated delay={240}>
        <Heading size="section">Support</Heading>
        <BodyText>
          Open participant-visible support for funding, release, fee, or dispute follow-up without
          leaving the native room.
        </BodyText>
        <Heading size="section">Reason</Heading>
        <View style={styles.stack}>
          {supportReasonOptions.map((option) => (
            <SecondaryButton
              key={option.value}
              onPress={() => setSupportReason(option.value)}
            >
              {supportReason === option.value ? `Selected: ${option.label}` : option.label}
            </SecondaryButton>
          ))}
        </View>
        <SegmentedControl
          value={supportSeverity}
          onChange={setSupportSeverity}
          options={[
            { label: 'Routine', value: 'routine' },
            { label: 'Elevated', value: 'elevated' },
            { label: 'Critical', value: 'critical' },
          ]}
        />
        <Field
          label="Subject"
          onChangeText={setSupportSubject}
          placeholder="Short support subject"
          value={supportSubject}
        />
        <Textarea
          label="Description"
          onChangeText={setSupportDescription}
          placeholder="What happened, desired outcome, and relevant milestone context"
          value={supportDescription}
        />
        <PrimaryButton
          disabled={
            networkGate.actionBlocked ||
            createSupportCase.isPending ||
            !supportSubject.trim() ||
            !supportDescription.trim()
          }
          loading={createSupportCase.isPending}
          onPress={() => createSupportCase.mutate()}
        >
          Open support case
        </PrimaryButton>
        <SupportCaseList
          supportCases={room.supportCases}
          selectedCaseId={selectedSupportCase?.id ?? ''}
          onSelect={setSelectedSupportCaseId}
        />
        {selectedSupportCase ? (
          <>
            <MetricRow label="Selected case" value={selectedSupportCase.subject} />
            <Textarea
              label="External reply"
              onChangeText={setSupportReply}
              placeholder="Add a participant-visible support update"
              value={supportReply}
            />
            <SecondaryButton
              disabled={
                networkGate.actionBlocked || postSupportReply.isPending || !supportReply.trim()
              }
              onPress={() => postSupportReply.mutate()}
            >
              Post support reply
            </SecondaryButton>
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard animated delay={270}>
        <Heading size="section">Marketplace reviews</Heading>
        {reviewsQuery.isLoading ? <BodyText>Loading reviews...</BodyText> : null}
        <ReviewList reviews={reviews} />
        {canLeaveReview ? (
          <View style={styles.stack}>
            <Heading size="section">Leave review</Heading>
            <BodyText>
              Reviews are available after completed or resolved contracts and are captured once per
              participant.
            </BodyText>
            <ScoreControl label="Overall rating" value={reviewRating} onChange={setReviewRating} />
            <ScoreControl
              label="Scope clarity"
              value={reviewScores.scopeClarity}
              onChange={(value) => updateReviewScore('scopeClarity', value)}
            />
            <ScoreControl
              label="Communication"
              value={reviewScores.communication}
              onChange={(value) => updateReviewScore('communication', value)}
            />
            <ScoreControl
              label="Timeliness"
              value={reviewScores.timeliness}
              onChange={(value) => updateReviewScore('timeliness', value)}
            />
            <ScoreControl
              label="Outcome quality"
              value={reviewScores.outcomeQuality}
              onChange={(value) => updateReviewScore('outcomeQuality', value)}
            />
            <Field
              label="Headline"
              onChangeText={setReviewHeadline}
              placeholder="Optional short summary"
              value={reviewHeadline}
            />
            <Textarea
              label="Review"
              onChangeText={setReviewBody}
              placeholder="What should future clients or workers know?"
              value={reviewBody}
            />
            <PrimaryButton
              disabled={networkGate.actionBlocked || createReview.isPending || !reviewBody.trim()}
              loading={createReview.isPending}
              onPress={() => createReview.mutate()}
            >
              Submit review
            </PrimaryButton>
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard animated delay={300}>
        <Heading size="section">Activity</Heading>
        <ActivityList activity={room.activity} />
      </SurfaceCard>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  artifactRow: {
    gap: 12,
    paddingVertical: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  noticeBlock: {
    gap: 8,
    paddingTop: 4,
  },
  stack: {
    gap: 10,
  },
  threadItem: {
    gap: 8,
    paddingVertical: 4,
  },
});
