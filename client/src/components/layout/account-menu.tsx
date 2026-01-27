import { Link } from "wouter";
import { ChevronDown, LogOut, SlidersHorizontal, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/profile-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/action-menu";

interface AccountMenuProps {
  name: string;
  email: string;
  imageUrl?: string;
  onLogout: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({ name, email, imageUrl, onLogout }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-figma-border bg-figma-card px-2.5 shadow-sm transition-colors hover:bg-figma-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-7 bg-figma-hover text-figma-secondary">
            {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-4 text-figma-secondary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 py-2">
        <DropdownMenuLabel className="px-4 py-3 font-normal">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 bg-figma-hover text-figma-secondary">
              {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-figma-primary">{name}</span>
              <span className="block truncate text-xs text-figma-secondary">{email}</span>
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings/team" className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
            <UsersRound className="size-4 text-figma-secondary" aria-hidden="true" />
            <span>Team</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings/preferences" className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
            <SlidersHorizontal className="size-4 text-figma-secondary" aria-hidden="true" />
            <span>Preferences</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
