// Contrato de pagamento do sinal da reserva.
// Seção 20: interface + implements e polimorfismo.
// A reserva só conhece "algum pagamento". Hoje é o simulado; na fase do Pix
// entra uma classe PagamentoMercadoPago implements Pagamento, e o resto não muda.

export type CobrancaGerada = {
  idExterno: string;
  valor: number;
  copiaECola: string;
  expiraEm: Date;
};

export interface Pagamento {
  gerarCobranca(reservaId: number, valor: number): Promise<CobrancaGerada>;
}

// Usado enquanto o Mercado Pago não está ligado (desenvolvimento e testes).
export class PagamentoSimulado implements Pagamento {
  async gerarCobranca(reservaId: number, valor: number): Promise<CobrancaGerada> {
    const trintaMinutos = 30 * 60 * 1000;

    return {
      idExterno: `simulado-${reservaId}-${Date.now()}`,
      valor,
      copiaECola: `PIX-SIMULADO-RESERVA-${reservaId}`,
      expiraEm: new Date(Date.now() + trintaMinutos),
    };
  }
}
