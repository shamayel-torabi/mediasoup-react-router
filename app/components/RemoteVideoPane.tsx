import { memo, useEffect, useRef } from "react";

export const RemoteVideoPane = memo(({ combinedStream, userName, className }:
  { combinedStream: MediaStream, userName: string, className: string }
) => {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (video.current) {
      video.current.srcObject = combinedStream;
    }

  }, []);

  return (
    <div className="grid grid-flow-row justify-items-center gap-0.5">
      <video ref={video} className={className} autoPlay controls playsInline></video>
      <p className="text-center">{userName}</p>
    </div>
  )
});