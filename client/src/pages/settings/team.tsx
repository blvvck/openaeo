import { useEffect, useState } from 'react';
import { useUser } from '@clerk/react';
import { Mail, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/field-label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tab-set';
import { CardEmptyState, PageHeader, TablePagination } from '@/components/shared';
import { useWorkspaceAdminAction, useWorkspaceMembers, useWorkspaceRole } from '@/hooks/use-workspace-admin';
import type {
  InviteRole,
  WorkspaceInvitationView,
  WorkspaceMemberView,
} from '@shared/types/workspace-admin';

type MemberTarget = { kind: 'member'; item: WorkspaceMemberView };
type InviteTarget = { kind: 'invite'; item: WorkspaceInvitationView };
type ActionTarget = MemberTarget | InviteTarget;

const tabTriggerClass = 'rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors';
const PAGE_SIZE = 10;
const memberStatusLabels: Record<WorkspaceMemberView['status'], string> = {
  active: 'Active',
  deactivated: 'Deactivated',
};
const inviteStatusLabels: Record<WorkspaceInvitationView['status'], string> = {
  invited: 'Invited',
  reminder_sent: 'Reminder sent',
  canceled: 'Canceled',
};

export function TeamSettingsPage() {
  const { user } = useUser();
  const role = useWorkspaceRole() ?? 'viewer';
  const { data, isLoading, isError } = useWorkspaceMembers();
  const action = useWorkspaceAdminAction();
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [target, setTarget] = useState<ActionTarget | null>(null);
  const [roleDraft, setRoleDraft] = useState<InviteRole>('member');
  const [memberOffset, setMemberOffset] = useState(0);
  const [inviteOffset, setInviteOffset] = useState(0);

  const run = async (operation: () => Promise<unknown>) => {
    setError(null);
    try {
      await operation();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request failed');
      return false;
    }
  };

  const openTarget = (next: ActionTarget) => {
    setError(null);
    setTarget(next);
    if (next.kind === 'member' && next.item.role !== 'owner') setRoleDraft(next.item.role as InviteRole);
  };

  useEffect(() => {
    setMemberOffset(0);
    setInviteOffset(0);
  }, [data?.members.length, data?.invitations.length]);

  const canManage = role === 'owner' || role === 'admin';
  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const visibleMembers = members.slice(memberOffset, memberOffset + PAGE_SIZE);
  const visibleInvitations = invitations.slice(inviteOffset, inviteOffset + PAGE_SIZE);
  const currentMemberId = members.find((member) =>
    member.email === user?.primaryEmailAddress?.emailAddress,
  )?.id;

  if (!canManage) {
    return (
      <main role="main" aria-label="Team settings" className="space-y-6">
        <PageHeader title="Team" subtitle="Manage workspace members, roles, and invitations" />
        <p className="text-figma-sm text-figma-secondary">Only workspace owners and admins can manage the team.</p>
      </main>
    );
  }

  return (
    <main role="main" aria-label="Team settings" className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Manage workspace members, roles, and invitations"
        action={<Button onClick={() => { setError(null); setInviteOpen(true); }}>Invite member</Button>}
      />
      {error && <p className="text-figma-sm text-figma-red">{error}</p>}
      {isLoading ? (
        <p className="text-figma-sm text-figma-secondary">Loading members...</p>
      ) : isError ? (
        <p className="text-figma-sm text-figma-red">Could not load workspace members.</p>
      ) : (
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="mb-6 inline-flex items-center gap-6 rounded-none border-b border-figma-border-light p-0 h-auto w-full justify-start bg-transparent">
            <TabsTrigger value="members" className={tabTriggerClass}>Members</TabsTrigger>
            <TabsTrigger value="invitations" className={tabTriggerClass}>Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <div className="border border-figma-border rounded-xl bg-figma-card overflow-hidden">
              {members.length === 0 ? (
                <CardEmptyState icon={Users} title="No members" description="Workspace members will appear here." />
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-figma-border-light text-figma-xs text-figma-secondary text-left">
                        <th className="px-5 py-3 align-middle font-medium">Name</th>
                        <th className="px-5 py-3 align-middle font-medium">Role</th>
                        <th className="px-5 py-3 align-middle font-medium">Status</th>
                        <th className="px-5 py-3 align-middle font-medium">Joined</th>
                        <th className="px-5 py-3 align-middle w-12" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map((member) => (
                        <tr key={member.id} className="h-14 border-b border-figma-border-light last:border-0">
                          <td className="px-5 align-middle">
                            <div className="flex h-full flex-col justify-center gap-0.5">
                              <div className="text-figma-sm font-medium leading-tight text-figma-primary">{member.name}</div>
                              <div className="text-figma-xs leading-tight text-figma-secondary">{member.email}</div>
                            </div>
                          </td>
                          <td className="px-5 align-middle text-figma-sm text-figma-secondary capitalize">{member.role}</td>
                          <td className="px-5 align-middle text-figma-sm text-figma-muted">{memberStatusLabels[member.status]}</td>
                          <td className="px-5 align-middle text-figma-sm text-figma-muted">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 align-middle text-right">
                            <button
                              type="button"
                              aria-label={`Actions for ${member.name}`}
                              onClick={() => openTarget({ kind: 'member', item: member })}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-figma-secondary hover:bg-figma-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-figma-blue"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="[&>div]:mt-0 [&>div]:px-5 [&>div]:pt-3 [&>div]:pb-4">
                    <TablePagination
                      offset={memberOffset}
                      pageSize={PAGE_SIZE}
                      total={members.length}
                      onPrevious={() => setMemberOffset((current) => Math.max(0, current - PAGE_SIZE))}
                      onNext={() => setMemberOffset((current) => current + PAGE_SIZE)}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invitations">
            <div className="border border-figma-border rounded-xl bg-figma-card overflow-hidden">
              {invitations.length === 0 ? (
                <CardEmptyState
                  icon={Mail}
                  title="No pending invitations"
                  description="Invite a teammate to collaborate in this workspace."
                  action={{ label: 'Invite member', onClick: () => setInviteOpen(true) }}
                />
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-figma-border-light text-figma-xs text-figma-secondary text-left">
                        <th className="px-5 py-3 align-middle font-medium">Email</th>
                        <th className="px-5 py-3 align-middle font-medium">Role</th>
                        <th className="px-5 py-3 align-middle font-medium">Status</th>
                        <th className="px-5 py-3 align-middle font-medium">Expires</th>
                        <th className="px-5 py-3 align-middle w-12" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleInvitations.map((invitation) => (
                        <tr key={invitation.id} className="h-14 border-b border-figma-border-light last:border-0">
                          <td className="px-5 align-middle text-figma-sm text-figma-primary">{invitation.email}</td>
                          <td className="px-5 align-middle text-figma-sm text-figma-secondary capitalize">{invitation.role}</td>
                          <td className="px-5 align-middle text-figma-sm text-figma-muted">{inviteStatusLabels[invitation.status]}</td>
                          <td className="px-5 align-middle text-figma-sm text-figma-muted">
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 align-middle text-right">
                            <button
                              type="button"
                              aria-label={`Actions for ${invitation.email}`}
                              onClick={() => openTarget({ kind: 'invite', item: invitation })}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-figma-secondary hover:bg-figma-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-figma-blue"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="[&>div]:mt-0 [&>div]:px-5 [&>div]:pt-3 [&>div]:pb-4">
                    <TablePagination
                      offset={inviteOffset}
                      pageSize={PAGE_SIZE}
                      total={invitations.length}
                      onPrevious={() => setInviteOffset((current) => Math.max(0, current - PAGE_SIZE))}
                      onNext={() => setInviteOffset((current) => current + PAGE_SIZE)}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-figma-md font-semibold text-figma-primary">Invite member</DialogTitle>
            <DialogDescription className="text-figma-sm text-figma-secondary">
              Send an invitation to join this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="invite-email" className="text-figma-sm text-figma-primary">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="colleague@company.com"
              className="text-figma-sm"
            />
            <Label htmlFor="invite-role" className="text-figma-sm text-figma-primary">Role</Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as InviteRole)}>
              <SelectTrigger id="invite-role" className="text-figma-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={async () => {
                if (await run(() => action.invite(inviteEmail.trim(), inviteRole))) {
                  setInviteEmail('');
                  setInviteOpen(false);
                }
              }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={target !== null} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-figma-md font-semibold text-figma-primary">
              {target?.kind === 'member' ? 'Manage member' : 'Manage invitation'}
            </DialogTitle>
            <DialogDescription className="text-figma-sm text-figma-secondary">
              {target?.kind === 'member'
                ? `${target.item.name} · ${target.item.email}`
                : target?.item.email}
            </DialogDescription>
          </DialogHeader>
          {target?.kind === 'member' && (
            <div className="space-y-4 py-2">
              {target.item.role === 'owner' ? (
                <p className="text-figma-sm text-figma-secondary">The workspace owner cannot be changed, deactivated, or removed.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="member-role" className="text-figma-sm text-figma-primary">Role</Label>
                    <Select value={roleDraft} onValueChange={(value) => setRoleDraft(value as InviteRole)}>
                      <SelectTrigger id="member-role" className="text-figma-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (target.item.id === currentMemberId) {
                        setError('You cannot change your own role.');
                        return;
                      }
                      if (await run(() => action.updateRole(target.item.id, roleDraft))) setTarget(null);
                    }}
                  >
                    Save role
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (target.item.id === currentMemberId) {
                        setError('You cannot change your own status.');
                        return;
                      }
                      const status = target.item.status === 'active' ? 'deactivated' : 'active';
                      if (await run(() => action.updateStatus(target.item.id, status))) setTarget(null);
                    }}
                  >
                    {target.item.status === 'active' ? 'Deactivate member' : 'Activate member'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (await run(() => action.removeMember(target.item.id))) setTarget(null);
                    }}
                  >
                    Remove member
                  </Button>
                </>
              )}
            </div>
          )}
          {target?.kind === 'invite' && (
            <div className="space-y-3 py-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (await run(() => action.resendInvite(target.item.id))) setTarget(null);
                }}
              >
                Resend invitation
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (await run(() => action.cancelInvite(target.item.id))) setTarget(null);
                }}
              >
                Cancel invitation
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
