import { GlobalLoading } from '@/components/ui/global-loading';

export default function UserProfileLoading() {
  return <GlobalLoading message="LOADING PROFILE..." fullScreen={true} />;
}
