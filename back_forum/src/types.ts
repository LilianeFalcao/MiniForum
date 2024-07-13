export type TypeUser = {
    id: string,
    apelido: string,
    email: string,
    password: string,
}

export type TypePost = {
    id: string,
    title: string,
    content: string,
    created_at: string,
    user_id: string,
}

export type TypeComment = {
    id: string,
    content: string,
    user_id: string,
    post_id: string,
}
export interface User {
    id: string;
}