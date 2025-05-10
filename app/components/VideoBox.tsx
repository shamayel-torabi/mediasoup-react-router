import { memo, useEffect, useRef, type VideoHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
    userName?: string;
    source?: MediaStream;
    //ref?: Ref<HTMLVideoElement>
    vidClass?: string;
    divClass?: string;
}

const VideoBox: React.FC<VideoProps> = (props) => {
    const { userName, source, vidClass, divClass, ...vidProps } = props;
    const divCls = twMerge(["", divClass]);
    const vidCls = twMerge(["mx-auto aspect-video", vidClass]);
    const vidRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (vidRef.current && source) {
            vidRef.current.srcObject = source
        }

    }, [source])

    return (
        <div className={divCls}>
            <video className={vidCls} ref={vidRef} {...vidProps}></video>
            <p className=" text-center">{props.userName}</p>
        </div>
    )
}

export default memo(VideoBox);