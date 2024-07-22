import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from "dotenv"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db } from './database/knex';
import { v4 as uuidv4 } from 'uuid'; 
import {TypeUser } from './types'

const app = express()

app.use(cors())
app.use(express.json())

//dotenv config
dotenv.config()

//geração de token
export interface TokenPayload {
    id: string,
    name: string,
}

export class TokenManager {
    public createToken = (payload: TokenPayload): string => {
        const token = jwt.sign(
            payload,
            process.env.JWT_KEY as string,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        )
        return token
    }

    public getPayload = (token: string): TokenPayload | null =>{
        try {
            const payload = jwt.verify(
                token,
                process.env.JWT_KEY as string
            )

            return payload as TokenPayload
        } catch (error) {
            return null
        }
    }
}

// hash
export class HashManager{
    public hash = async( plaintext: string ): Promise<string> => {
        const rounds = Number(process.env.BCRYPT_COST);
        const salt = await bcrypt.genSalt(rounds);
        const hash = await bcrypt.hash(plaintext, salt);

        return hash;
    }
    public compare = async (plaintext: string, hash: string): Promise<boolean> => {
        return bcrypt.compare(plaintext, hash);
    }
}

app.listen(Number(process.env.PORT || 3004), () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 3004}`)
})

app.get("/users", async (req: Request, res: Response) => {
    try {
        const usuarios: Array<TypeUser> = await db("users");
        res.status(200).send(usuarios);
    } catch (error) {
        console.log(error);
        if (res.statusCode === 200) {
            res.status(500);
        }
        if (error instanceof Error) {
            res.send(error.message);
        } else {
            res.send("Erro inesperado.");
        }
    }
});
//cadastro de usuario 
app.post("/users", async (req: Request, res: Response) => {
    try {
        const {apelido, email, password } = req.body;

        if(!apelido || !email || !password ){
            return res.status(400).send("Dados Inválidos")
        }

        if (typeof apelido !== "string") {
            res.statusCode = 400;
            throw new Error('O atributo "apelido" deve ser uma string');
        }
        if (apelido.length < 2) {
            res.statusCode = 400;
            throw new Error("O 'apelido' do usuário deve conter no mínimo 2 caracteres");
        }
        if (typeof email !== "string") {
            res.statusCode = 400;
            throw new Error ("O 'email' do usuário deve ser uma 'string'");
        }
        if (typeof password !== "string") {
            res.statusCode = 400;
            throw new Error ("O 'password' do usuário deve ser uma 'string'");
        }

        const id = uuidv4();
        const hashManager = new HashManager();
        const hashedPassword = await hashManager.hash(password);
        
        const newUser: TypeUser = {
            id,
            apelido: apelido,
            email: email,
            password: hashedPassword
        }

        await db("users").insert(newUser);
        res.status(201).send("Cadastro do Usuário realizado com sucesso!")
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Algo deu errado" });
    }
})

app.post("/login", async (req: Request, res: Response) => {
    try {
        const {email, password } = req.body;

        if(!email || !password ){
            return res.status(400).json({error: "Email e senha são obrigatórios" })
        }

        const user: TypeUser = await db("users").where({email}).first();

        if(!user){
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const hashManager = new HashManager();
        const passwordIsCorrect = await hashManager.compare(password, user.password);

        if(!passwordIsCorrect){
            return res.status(401).json({ error: "Senha inválida" });
        }

        const tokenManager = new TokenManager();
        const token = tokenManager.createToken({ id: user.id, name: user.apelido });

        return res.json({ token });

    } catch (error) {
        console.error("Erro ao fazer login:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
})

//postagem

app.get("/posts", async (req, res) => {
    try {
        const result = await db("posts").select("*");
        res.status(200).send(result);
    } catch (error) {
        console.error("Erro:", error);
        res.status(500).send("Erro inesperado.");
    }
});

app.get("/posts/:postId", async (req, res) => {
    try {
        const result = await db("posts").select("*");
        res.status(200).send(result);
    } catch (error) {
        console.error("Erro:", error);
        res.status(500).send("Erro inesperado.");
    }
});

app.post("/posts", async (req: Request, res: Response) =>{
    try {
        const { title, content, user_id, numeroLikes , numeroDeslikes } = req.body;
        
        if(!title || !content ){
            return res.status(400).send("Dados Inválidos")
        }

        if(typeof content !== "string"){
            return res.status(400).send("Conteúdo deve ser uma string")
        }

        if (content.length < 1) {
            res.status(400).send("O 'content' do usuário deve conter no mínimo 1 caracter");
            return;
        }

        if (typeof user_id !== "string") {
            res.status(400).send("O 'responsavelId' do usuário deve ser uma 'string'");
            return;
        }
        const id = uuidv4();
        const createdAt = new Date().toISOString()
        await db("posts").insert({
            id,
            title: title,
            content: content, 
            user_id: user_id,
            created_at: createdAt,
            numeroLikes: numeroLikes || 0, 
            numeroDeslikes: numeroDeslikes || 0,
        });
        res.status(201).send("Post do usuário realizado com sucesso!");

    } catch (error) {
            console.error("Erro:", error);
            res.status(500).send("Erro inesperado.");
    }
})
//curtir post
app.post("/posts/:postId/likes", async (req, res) => {
    const { postId } = req.params;
    const { userId, action } = req.body;

    if (!userId || !action) {
        return res.status(400).json({ error: "Parâmetros userId e action são obrigatórios." });
    }

    if (!['like', 'deslike', 'removeLike', 'removeDeslike'].includes(action)) {
        return res.status(400).json({ error: "Ação inválida. Use 'like', 'deslike', 'removeLike' ou 'removeDeslike'." });
    }

    try {
        const postExists = await db("posts").where({ id: postId }).first();
        if (!postExists) {
            return res.status(404).json({ error: "O post não foi encontrado." });
        }

        const existingReaction = await db("reactions").where({ user_id: userId, post_id: postId }).first();

        await db.transaction(async trx => {
            if (action === 'like') {
                if (existingReaction) {
                    if (existingReaction.type === 'deslike') {
                        await trx("reactions").where({ user_id: userId, post_id: postId }).update({ type: 'like' });
                        await trx("posts").where({ id: postId }).increment('numeroLikes', 1);
                        await trx("posts").where({ id: postId }).decrement('numeroDeslikes', 1);
                        return res.status(200).json({ message: "Deslike substituído por like com sucesso!" });
                    } else if (existingReaction.type === 'like') {
                        return res.status(400).json({ error: "Você já curtiu este post." });
                    }
                } else {
                    await trx("reactions").insert({ id: uuidv4(), user_id: userId, post_id: postId, type: 'like' });
                    await trx("posts").where({ id: postId }).increment('numeroLikes', 1);
                    return res.status(200).json({ message: "Post curtido com sucesso!" });
                }
            } else if (action === 'deslike') {
                if (existingReaction) {
                    if (existingReaction.type === 'like') {
                        await trx("reactions").where({ user_id: userId, post_id: postId }).update({ type: 'deslike' });
                        await trx("posts").where({ id: postId }).increment('numeroDeslikes', 1);
                        await trx("posts").where({ id: postId }).decrement('numeroLikes', 1);
                        return res.status(200).json({ message: "Like substituído por deslike com sucesso!" });
                    } else if (existingReaction.type === 'deslike') {
                        return res.status(400).json({ error: "Você já descurtiu este post." });
                    }
                } else {
                    await trx("reactions").insert({ id: uuidv4(), user_id: userId, post_id: postId, type: 'deslike' });
                    await trx("posts").where({ id: postId }).increment('numeroDeslikes', 1);
                    return res.status(200).json({ message: "Post descurtido com sucesso!" });
                }
            } else if (action === 'removeLike') {
                if (existingReaction && existingReaction.type === 'like') {
                    await trx("reactions").where({ user_id: userId, post_id: postId }).del();
                    await trx("posts").where({ id: postId }).decrement('numeroLikes', 1);
                    return res.status(200).json({ message: "Like removido com sucesso!" });
                } else {
                    return res.status(400).json({ error: "Você não curtiu este post." });
                }
            } else if (action === 'removeDeslike') {
                if (existingReaction && existingReaction.type === 'deslike') {
                    await trx("reactions").where({ user_id: userId, post_id: postId }).del();
                    await trx("posts").where({ id: postId }).decrement('numeroDeslikes', 1);
                    return res.status(200).json({ message: "Deslike removido com sucesso!" });
                } else {
                    return res.status(400).json({ error: "Você não descurtiu este post." });
                }
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao processar a solicitação." });
    }
});


// Endpoint para criar um novo comentário em um post específico
app.post("/posts/:postId/comentarios", async (req, res) => {
    try {
        const { postId } = req.params;
        const { user_id, content } = req.body;

        // Verifica se o post existe
        const postExists = await db("posts").where({ id: postId }).first();

        if (!postExists) {
            
            return res.status(404).json({ error: "O post não foi encontrado." });
        }
        // Validação dos dados do comentário
        if (!user_id || !content) {
            return res.status(400).json({ error: "Dados inválidos para o comentário." });
        }

        if (typeof user_id !== "string") {
            return res.status(400).json({ error: "O 'user_id' deve ser uma string." });
        }

        if (typeof content !== "string") {
            return res.status(400).json({ error: "O 'content' do comentário deve ser uma string." });
        }

        // Insere o comentário no banco de dados
        const commentId = uuidv4();
        await db("comments").insert({
            id: commentId,
            user_id: user_id,
            post_id: postId,
            content: content
        });

        return res.status(201).json({ message: "Comentário adicionado com sucesso." });
    } catch (error) {
        console.error("Erro ao adicionar comentário:", error);
        return res.status(500).json({ error: "Erro interno do servidor ao adicionar comentário." });
    }
});

// Endpoint para listar todos os comentários de um post específico
app.get("/posts/:postId/comentarios", async (req, res) => {
    try {
        const { postId } = req.params;

        // Busca todos os comentários do post no banco de dados
        const comments = await db("comments").where({ post_id: postId });

        return res.status(200).json(comments);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        return res.status(500).json({ error: "Erro interno do servidor ao buscar comentários." });
    }
});


