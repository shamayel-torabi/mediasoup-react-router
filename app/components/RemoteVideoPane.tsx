import { useEffect, useRef } from "react";
import { useMediaContext } from "./MediaProvider";

export const RemoteVideoPane = ({ className, aid }:
  { className: string, aid: string }
) => {

  const { consumers, activeSpeakers } = useMediaContext();

  const videoDiv = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const classList = className.split(' ');

  useEffect(() => {
    if (!playerRef.current) {
      if (videoDiv.current) {
        const videoElement = document.createElement("video");
        classList.forEach(c => videoElement.classList.add(c))

        videoElement.autoplay = true;
        videoElement.controls = true;
        videoElement.playsInline = true;

        videoDiv.current.appendChild(videoElement);
        playerRef.current = videoElement;
      }
    }
    else {
      const consumer = consumers[aid];
      if (consumer)
        playerRef.current.srcObject = consumer.combinedStream;
    }
  }, [videoDiv, playerRef, activeSpeakers]);


  return (
    <div ref={videoDiv} className="grid grid-flow-row justify-items-center gap-0.5">
      <p className="text-center"></p>
    </div>
  );

  // return (
  //   <div className="grid grid-flow-row justify-items-center gap-0.5">
  //     <video
  //       ref={(ref) => { if (ref) ref.srcObject = combinedStream }}
  //       className={className}
  //       autoPlay={true}
  //       controls
  //       playsInline>
  //     </video>
  //     <p className="text-center">{userName}</p>
  //   </div>
  // )
};