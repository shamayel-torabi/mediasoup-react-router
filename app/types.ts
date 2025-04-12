
export type Post = {
    id: number
    userId: number
    title: string
    body: string
}


export type User = {
    id: string;
    email: string,
    role: string,
    firstName: string,
    lastName: string,
    image?: string,
    createdAt: Date
}

