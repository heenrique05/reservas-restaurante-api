import request from 'supertest';
import app from './app';

// Estes testes não usam o banco: a conexão só abre na primeira consulta.
describe('documentação e CORS', () => {
  it('should serve the OpenAPI document with every route', async () => {
    const resposta = await request(app).get('/docs.json');

    expect(resposta.status).toBe(200);
    expect(resposta.body.openapi).toBe('3.0.3');
    expect(Object.keys(resposta.body.paths)).toEqual(
      expect.arrayContaining(['/usuarios', '/tokens', '/mesas', '/reservas', '/lista-espera', '/disponibilidade', '/relatorios']),
    );
  });

  it('should serve the Swagger page', async () => {
    const resposta = await request(app).get('/docs/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('swagger-ui');
  });

  it('should accept calls from the API itself (Swagger "Try it out")', async () => {
    const resposta = await request(app).get('/').set('Host', 'api.exemplo.com').set('Origin', 'https://api.exemplo.com');

    expect(resposta.status).toBe(200);
  });

  it('should refuse a browser call from an unknown site', async () => {
    const resposta = await request(app).get('/').set('Host', 'api.exemplo.com').set('Origin', 'https://site-estranho.com');

    expect(resposta.status).toBe(403);
  });
});
