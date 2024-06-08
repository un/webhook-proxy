"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SignOut } from "@phosphor-icons/react";
import { logout } from "./actions";

type UserDropdownProps = {
  username: string;
};

export function UserDropdown({ username }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer rounded-full">
        <button>
          <Avatar>
            <AvatarFallback>{username[0]}</AvatarFallback>
            <AvatarImage src={`https://github.com/${username}.png`} alt={`${username}'s Profile`} />
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm uppercase text-muted-foreground">Signed in as</span>
          <span className="text-base">{username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <span className="w-full">Logout</span>
          <SignOut />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
