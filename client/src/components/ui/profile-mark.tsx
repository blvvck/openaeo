import * as React from "react";

import { cn } from "@/lib/utils";

type ProfileImageState = { loaded: boolean; setLoaded: (loaded: boolean) => void };
const ProfileImageContext = React.createContext<ProfileImageState | null>(null);

function Avatar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <ProfileImageContext.Provider value={{ loaded, setLoaded }}>
      <div
        data-profile-mark
        className={cn("relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted", className)}
        {...props}
      >
        {children}
      </div>
    </ProfileImageContext.Provider>
  );
}

type AvatarImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> & {
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

function AvatarImage({ className, onLoad, onError, ...props }: AvatarImageProps) {
  const imageState = React.useContext(ProfileImageContext);
  if (!imageState) throw new Error("AvatarImage must be rendered inside Avatar");
  const { src, ...imageProps } = props;

  React.useEffect(() => {
    imageState.setLoaded(false);
  }, [imageState.setLoaded, src]);

  return (
    <img
      {...imageProps}
      src={src}
      data-profile-image
      className={cn("absolute inset-0 size-full object-cover", imageState.loaded ? "opacity-100" : "opacity-0", className)}
      onLoad={(event) => {
        imageState.setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        imageState.setLoaded(false);
        onError?.(event);
      }}
    />
  );
}

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const imageState = React.useContext(ProfileImageContext);
  if (!imageState) throw new Error("AvatarFallback must be rendered inside Avatar");

  if (imageState.loaded) return null;
  return (
    <div
      data-profile-fallback
      className={cn("grid size-full place-items-center rounded-full bg-muted text-sm font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
