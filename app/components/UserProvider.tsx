import { createContext, useContext } from "react";
import type { User } from "~/types";

type UserContextType = {
    user?: User
}

const UserContext = createContext<UserContextType>({ user: undefined })

export default function UserProvider({ children, user }: { children: React.ReactNode, user: User | undefined }) {
    return (
        <UserContext value={{ user }}>
            {children}
        </UserContext>
    )
}


export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('UserProvider not set');
    }

    return context;
}