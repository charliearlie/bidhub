import type { User } from "@prisma/client";
import { Link } from "@remix-run/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/common/dropdown-menu";

type Props = {
  className: string;
  user: User | null;
};
export default function UserDropDown({ className, user }: Props) {
  if (!user) {
    return (
      <div className={className}>
        <Link to="/login" className={`button button-primary w-20 lg:block`}>
          Log in
        </Link>
      </div>
    );
  }

  const navigation = [
    { title: "Dashboard", path: "/user/dashboard" },
    { title: "Settings", path: "/user/settings" },
    { title: "Log out", path: "/logout" },
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className="h-10 w-10 rounded-full outline-none ring-2 ring-white ring-offset-2 lg:focus:ring-violet-500">
              <img
                src="https://ih1.redbubble.net/image.1003426384.0291/st,small,507x507-pad,600x600,f8f8f8.jpg"
                className="h-full w-full rounded-full"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{user.username}'s account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ul>
              {navigation.map((item, idx) => (
                <DropdownMenuItem
                  className="cursor-pointer p-4"
                  asChild
                  key={idx}
                >
                  <Link
                    className="block cursor-pointer text-gray-700 hover:bg-gray-50"
                    to={item.path}
                  >
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              ))}
            </ul>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
