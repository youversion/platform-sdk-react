import { ProfileAvatar, YouVersionAuthButton, useYVAuth } from '@youversion/platform-react-ui';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

export function ProfilePage() {
  const { auth, userInfo, signOut } = useYVAuth();
  const avatarUrl = userInfo?.avatarUrl?.toString();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 p-6 md:p-12">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {auth.isAuthenticated ? (
        <div className="flex flex-col items-start gap-3">
          <ProfileAvatar name={userInfo?.name} src={avatarUrl} />
          <p className="text-sm">{userInfo?.name ?? 'Signed in'}</p>
          {userInfo?.email ? (
            <p className="text-sm text-muted-foreground">{userInfo.email}</p>
          ) : null}
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      ) : auth.isLoading ? (
        <p className="text-sm text-muted-foreground">Checking sign-in…</p>
      ) : (
        <YouVersionAuthButton
          size="short"
          scopes={['profile', 'email']}
          onAuthError={(err) => console.error('Auth error:', err)}
        />
      )}
      <section className="flex flex-col items-start gap-3">
        <h2 className="text-sm font-medium">Appearance</h2>
        <ModeToggle />
      </section>
    </div>
  );
}
