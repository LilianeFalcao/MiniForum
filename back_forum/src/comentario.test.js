const axios = require('axios');

// Endpoint URL
const BASE_URL = 'http://localhost:3004';

    test('Criar novo comentário', async () => {
    const postId = 'fa2f149c-fad3-48d0-a193-59489fddca1c'; // Substitua pelo ID de um post existente
    try {
        const response = await axios.post(`${BASE_URL}/posts/${postId}/comments`, {
            id: 1,
            user_id: 'd371b74b-fbe7-4568-9f0e-88a493a1a4dc',
            post_id: postId,
            content:'Novo comentário de teste',
        });
        expect(response.status).toBe(201);
        console.log('Comentário criado com sucesso:', response.data);
    } catch (error) {
        console.error('Erro ao criar comentário:', error.response ? error.response.data : error.message);
        throw error;
    }
    });
