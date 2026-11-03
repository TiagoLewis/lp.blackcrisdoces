// Função do Vercel: recebe os dados do pop-up de aluna(o) e envia para o e-mail da Crisdoces pelo Gmail.
// Precisa de 2 variáveis de ambiente no Vercel (Settings > Environment Variables):
//   GMAIL_USER         = falecomcrisdoces@gmail.com
//   GMAIL_APP_PASSWORD = senha de app de 16 letras gerada no Google (não é a senha normal do Gmail)
// Opcional: EMAIL_DESTINO (se quiser receber em outro e-mail; padrão = GMAIL_USER)
const nodemailer = require('nodemailer');

const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dig = (v) => String(v || '').replace(/\D/g, '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'Use POST' });

  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_DESTINO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(500).json({ ok: false, erro: 'Faltam as variáveis GMAIL_USER e GMAIL_APP_PASSWORD no Vercel' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  if (b._honey) return res.status(200).json({ ok: true }); // robô: finge que deu certo

  const email = String(b.email || '').trim().slice(0, 200);
  const documento = String(b.documento || '').trim().slice(0, 30);
  const whatsapp = String(b.whatsapp || '').trim().slice(0, 30);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, erro: 'E-mail inválido' });
  if (![11, 14].includes(dig(documento).length)) return res.status(400).json({ ok: false, erro: 'CPF/CNPJ inválido' });
  if (dig(whatsapp).length < 10) return res.status(400).json({ ok: false, erro: 'WhatsApp inválido' });

  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const zap = 'https://wa.me/55' + dig(whatsapp);
  const linha = (k, v) => `<tr><td style="padding:10px 14px;background:#fff4e6;font-weight:700;border:1px solid #f0d9c4">${k}</td><td style="padding:10px 14px;border:1px solid #f0d9c4">${v}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#2b170e;max-width:560px">
      <h2 style="margin:0 0 6px">Nova aluna(o) quer o combo Black Friday 🧁</h2>
      <p style="margin:0 0 16px;color:#8a6a57">Valor de aluna(o): <b>R$ 149,00</b> · enviado em ${esc(quando)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:15px">
        ${linha('E-mail usado na compra', esc(email))}
        ${linha('CPF/CNPJ', esc(documento))}
        ${linha('WhatsApp', `+55 ${esc(whatsapp)} · <a href="${zap}">abrir conversa</a>`)}
      </table>
    </div>`;

  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: String(GMAIL_APP_PASSWORD).replace(/\s/g, '') } });
    await t.sendMail({
      from: `"Página Black Friday Crisdoces" <${GMAIL_USER}>`,
      to: EMAIL_DESTINO || GMAIL_USER,
      replyTo: email,
      subject: `Nova aluna(o) Black Friday R$149: ${email}`,
      text: `E-mail usado na compra: ${email}\nCPF/CNPJ: ${documento}\nWhatsApp: +55 ${whatsapp}\nOferta: Combo Black Friday R$ 149,00\nEnviado em: ${quando}`,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e && e.message);
    return res.status(500).json({ ok: false, erro: 'Falha no envio pelo Gmail: ' + (e && e.message) });
  }
};
