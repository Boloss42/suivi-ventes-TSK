import Image from "next/image";

export default function VehicleThumbnail({
  photoUrl,
  alt,
  size = 48,
  rounded = "rounded-md",
}: {
  photoUrl?: string | null;
  alt: string;
  size?: number;
  rounded?: string;
}) {
  if (!photoUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex shrink-0 items-center justify-center bg-ink-100 text-ink-300 ${rounded}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-1/2 w-1/2"
        >
          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
          <circle cx="6.5" cy="16.5" r="2.5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden bg-ink-100 ${rounded}`}
    >
      <Image src={photoUrl} alt={alt} fill className="object-cover" sizes={`${size}px`} />
    </div>
  );
}
