import type { Message } from "~/types";
import { useMediaContext } from "./MediaProvider";
import { Input } from "./ui/input";
import React from "react";

const ChatMessage = React.memo(({ message }: { message: Message }) => {
    const fa = new Intl.DateTimeFormat("fa-IR", { hour: "numeric", minute: "numeric" })
    const date = new Date(message.date);
    const timeStr = fa.format(date);

    return (
        <li>
            <div className="flex items-start gap-2.5 mb-2">
                <img className="w-8 h-8 rounded-full" src="/images/people/profile-picture-3.jpg" alt="Jese image" />
                <div className="flex flex-col w-[12rem] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                    <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{message.userName}</span>
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{timeStr}</span>
                    </div>
                    <p className="text-sm font-normal py-2.5 text-gray-900 dark:text-white">{message.text}</p>
                </div>
            </div>
        </li>
    )
})

function Chat() {
    const { messages, sendMessage } = useMediaContext();

    const handleSubmit = async (e: React.FocusEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const message = formData.get('message') as string;
        if (message) {
            await sendMessage(message);
            e.target.reset()
        }
    }

    const mm = messages.sort((a: Message, b: Message) => {
        const ad = new Date(a.date).getDate();
        const bd = new Date(b.date).getDate();

        return bd - ad;
    })

    return (
        <div className="grid mt-2 mx-2 bg-card text-card-foreground rounded-xl border shadow-sm">
            <div className="h-(--message--page--height) overflow-y-auto rounded-sm border shadow-sm mt-2 mx-2 p-2">
                <ul className="h-full ">
                    {mm.map((m) => <ChatMessage message={m} key={m.id} />)}
                </ul>
            </div>
            <div className="h-(--message--pane) pt-1 px-2">
                <form onSubmit={handleSubmit}>
                    <div className="flex">
                        <Input
                            type="text"
                            name="message"
                            id="message"
                            className="rounded-none rounded-s-sm"
                            placeholder="پیام را وارد کنید" />
                        <button type="submit" className="inline-flex items-center cursor-pointer px-3 text-sm text-gray-900 bg-gray-200 border rounded-e-sm border-gray-300 border-s-0 dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rtl:rotate-180 text-gray-500 hover:text-gray-50 dark:text-gray-400" fill="currentColor">
                                <path d="m27.45 15.11-22-11a1 1 0 0 0 -1.08.12 1 1 0 0 0 -.33 1l2.96 10.77-3 10.74a1 1 0 0 0 1 1.26 1 1 0 0 0 .45-.11l22-11a1 1 0 0 0 0-1.78zm-20.9 10 2.21-8.11h9.24v-2h-9.24l-2.21-8.11 18.21 9.11z" />
                                <path d="m0 0h32v32h-32z" fill="none" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default React.memo(Chat)
