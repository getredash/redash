import { currentUser } from '@/services/auth';

/* eslint-disable class-methods-use-this */

export default class UserPolicy {
  canEditUser(user) {
    return user && (user.id === currentUser.id || currentUser.isAdmin);
  }

  canEditBasicInfo(user) {
    return this.canEditUser(user) && !user.isDisabled;
  }

  canViewApiKey(user) {
    return this.canEditUser(user) && !user.isDisabled;
  }

  canChangePassword(user) {
    return this.canEditUser(user) && !user.isDisabled;
  }

  canResendInvitation(user) {
    return user && currentUser.isAdmin && user.isInvitationPending;
  }

  canSendPasswordResetEmail(user) {
    return user && currentUser.isAdmin && !user.isInvitationPending;
  }

  canToggleUser(user) {
    return user && currentUser.isAdmin;
  }
}
