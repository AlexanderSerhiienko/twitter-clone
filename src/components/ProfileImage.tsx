import Image from "next/image";
import { VscAccount } from "react-icons/vsc";

type ProfileImageProps = {
  src?: string | null;
  className?: string;
};

export const ProfileImage = ({ src, className = "" }: ProfileImageProps) => {
  return (
    <div className={`relative h-12 w-12 overflow-hidden rounded ${className}`}>
      {src ? (
        <Image src={src} alt="profile image" quality={100} fill />
      ) : (
        <VscAccount className="h-full w-full" />
      )}
      <img />
    </div>
  );
};
