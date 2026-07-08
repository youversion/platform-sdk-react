import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ModeToggle } from '@/components/mode-toggle';
import {
  SignInWithYouVersionPermission,
  useYVAuth,
  YouVersionAuthButton,
} from '@youversion/platform-react-ui';
import type { Page } from '@/App';

const navItems: { label: string; page: Page }[] = [
  { label: 'Bible Reader', page: 'bible-reader' },
  { label: 'Verse of the Day', page: 'votd' },
  { label: 'Bible Card', page: 'bible-card' },
];

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const { auth, userInfo, signOut } = useYVAuth();

  const handleNav = (page: Page) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <span className="mr-6 font-semibold text-sm hidden md:block">SDK Demo</span>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.page}
              variant={currentPage === item.page ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleNav(item.page)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>SDK Demo</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 mt-4">
              {navItems.map((item) => (
                <Button
                  key={item.page}
                  variant={currentPage === item.page ? 'secondary' : 'ghost'}
                  className="justify-start"
                  onClick={() => handleNav(item.page)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Right side: auth + dark mode */}
        <div className="ml-auto flex items-center gap-2">
          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2">
              {userInfo?.name ? (
                <span className="text-sm text-muted-foreground sm:block">{userInfo?.name}</span>
              ) : null}
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <YouVersionAuthButton
              size="short"
              onAuthError={(err) => console.error('Auth error:', err)}
              scopes={['profile', 'email']}
              permissions={[SignInWithYouVersionPermission.highlights]}
            />
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
