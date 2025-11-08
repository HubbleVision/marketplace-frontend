import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useSession, TOKEN_KEY } from "~/components/session";
import { useDevice } from "~/hooks/useDevice";
import { Loader2, LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { toastError, toastSuccess } from "~/lib/utils";
import Logo from "~/svg/logo";
import LogoAi from "~/svg/logo-ai";
import Google from "~/svg/google";
import Wallet from "~/svg/wallet";
import { WalletList } from "./wallet-list";
import ProfileIcon from "~/svg/profile";

const Profile: FC = () => {
  const { session, pending, userProfile, setSession } = useSession();
  const { small } = useDevice();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleWalletButtonClick = () => {
    setShowWalletList(!showWalletList);
  };

  const handleLoginSuccess = () => {
    setOpen(false);
    setShowWalletList(false);
    toastSuccess("Login in successfully");
  };

  const handleLoginError = (error: Error) => {
    toastError("Wallet login failed, please try again");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    toastSuccess("Logout successfully");
    setSession(false);
  };

  // Format wallet address display (truncate)
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // Determine login method
  const isEmailLogin = userProfile?.email != null;
  const userIdentifier = isEmailLogin
    ? userProfile?.email
    : userProfile?.wallet_address
      ? formatWalletAddress(userProfile.wallet_address)
      : "";

  return (
    <>
      {session && userProfile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center cursor-pointer">
              <ProfileIcon className="h-6 w-6 text-orange-300" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-hubble-background-secondary border-hubble-border min-w-[200px] p-3 rounded-lg"
            align="end"
          >
            <div className="py-4">
              <div className="rounded-lg p-0">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <ProfileIcon className="h-6 w-6 text-orange-300" />
                  </div>
                  <div className="w-full border border-[#ffffff50] rounded px-3 py-2 text-[#B8B8B8] text-xs text-center">
                    {userIdentifier}
                  </div>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-[#ffffff20]" />
            <DropdownMenuItem
              className="text-white hover:bg-hubble-background focus:bg-hubble-background cursor-pointer px-4 py-3"
              onClick={() => {
                navigate("/me/agents");
              }}
            >
              <LayoutDashboard className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">My Data Lab</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#ffffff20]" />
            <DropdownMenuItem
              className="text-white hover:bg-hubble-background focus:bg-hubble-background cursor-pointer px-4 py-3"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : pending || isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin text-white" />
      ) : small ? (
        <div
          className="w-8 h-8 rounded-full bg-hubble-primary hover:bg-hubble-primary/80 transition-colors flex items-center justify-center cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <Wallet className="text-black" />
        </div>
      ) : (
        <div
          className="px-6 py-2 text-sm bg-hubble-primary rounded-lg text-black cursor-pointer hover:bg-hubble-primary/80"
          onClick={() => setOpen(true)}
        >
          Connect Wallet
        </div>
      )}

      {small ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="bg-hubble-background border-none rounded-t-lg p-6"
          >
            <SheetHeader className="p-0">
              <SheetTitle className="flex items-center justify-center">
                <Logo className="inline" />
                <LogoAi className="inline ml-1" />
              </SheetTitle>
              <SheetDescription className="text-center text-hubble-secondary">
                Log in to your account
              </SheetDescription>
            </SheetHeader>
            <section className="flex flex-col gap-3 mt-4">
              <div className="bg-hubble-background-secondary rounded-lg p-4 flex items-center gap-3 opacity-50 cursor-not-allowed relative">
                <Google />
                <span className="text-white">Log in with Google</span>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-hubble-background rounded text-xs text-hubble-secondary border border-hubble-border">
                  Coming Soon
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div
                  className="bg-hubble-background-secondary rounded-lg p-4 flex items-center gap-3 hover:bg-hubble-background-secondary/60 transition-all duration-150 cursor-pointer"
                  onClick={handleWalletButtonClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleWalletButtonClick();
                    }
                  }}
                >
                  <Wallet className="text-white"/>
                  <span className="text-white">Continue with wallet</span>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-200 ease-out ${
                    showWalletList
                      ? "max-h-[500px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <WalletList
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginError}
                    onConnectingChange={setIsConnecting}
                  />
                </div>
              </div>
            </section>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-hubble-background border-none max-w-[440px] **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:ring-0 **:data-[slot=dialog-close]:ring-offset-0 **:data-[slot=dialog-close]:focus:ring-0 **:data-[slot=dialog-close]:focus:ring-offset-0 **:data-[slot=dialog-close]:outline-none">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center">
                <Logo className="inline" />
                <LogoAi className="inline ml-1" />
              </DialogTitle>
              <DialogDescription className="text-center text-hubble-secondary">
                Log in to your account
              </DialogDescription>
            </DialogHeader>
            <section className="flex flex-col gap-3 mt-4">
              <div className="bg-hubble-background-secondary rounded-lg p-4 flex items-center gap-3 opacity-50 cursor-not-allowed relative">
                <Google />
                <span className="text-white">Log in with Google</span>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-hubble-background rounded text-xs text-hubble-secondary border border-hubble-border">
                  Coming Soon
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div
                  className="bg-hubble-background-secondary rounded-lg p-4 flex items-center gap-3 hover:bg-hubble-background-secondary/60 transition-all duration-150 cursor-pointer"
                  onClick={handleWalletButtonClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleWalletButtonClick();
                    }
                  }}
                >
                  <Wallet className="text-white"/>
                  <span className="text-white">Continue with wallet</span>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-200 ease-out ${
                    showWalletList
                      ? "max-h-[500px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <WalletList
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginError}
                    onConnectingChange={setIsConnecting}
                  />
                </div>
              </div>
            </section>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Profile;
