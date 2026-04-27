import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import {
  formatAmount,
  formatTimestamp,
  previewHash,
  type JobMilestone,
  type ProductStatusTone,
  type ProjectActivity,
  type ProjectArtifact,
  type ProjectMessage,
  type ProjectSubmission,
} from '@escrow4334/product-core';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
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

export default function ContractProjectRoomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  const [selectedMilestoneValue, setSelectedMilestoneValue] = useState('0');
  const [submissionNote, setSubmissionNote] = useState('');
  const [artifactLines, setArtifactLines] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [messageBody, setMessageBody] = useState('');

  const roomQuery = useQuery({
    enabled: Boolean(accessToken && id),
    queryKey: ['project-room', id],
    queryFn: () => api.getProjectRoom(id as string, accessToken as string),
  });

  const room = roomQuery.data?.room ?? null;
  const job = room?.job ?? null;
  const participantRoles = room?.participantRoles ?? [];
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

  const submitMilestone = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job || !selectedMilestone) {
        throw new Error('Open a participant-scoped room before submitting work.');
      }
      if (!submissionNote.trim()) {
        throw new Error('Add a submission note before posting work.');
      }

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
            disabled={submitMilestone.isPending || !submissionNote.trim()}
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
            disabled={requestRevision.isPending || !revisionNote.trim()}
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
            disabled={approveSubmission.isPending}
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
            disabled={deliverApproved.isPending}
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
          disabled={postMessage.isPending || !messageBody.trim()}
          loading={postMessage.isPending}
          onPress={() => postMessage.mutate()}
        >
          Post message
        </PrimaryButton>
        <MessageList messages={room.messages} />
      </SurfaceCard>

      <SurfaceCard animated delay={240}>
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
