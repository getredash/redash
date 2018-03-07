import defaultProfileImageUrl from '@/assets/images/avatar.svg';

function getUserProfileImageUrl(user) {
  return user.is_disabled ? defaultProfileImageUrl : user.profile_image_url;
}

export default function init(ngModule) {
  ngModule.filter('profileImage', () => getUserProfileImageUrl);
}
