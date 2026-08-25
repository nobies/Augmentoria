const CLIENT_DOMAINS: Record<string, string> = {
  vodafone: 'vodafone.com',
  flynas: 'flynas.com',
  rta: 'rta.ae',
  neom: 'neom.com',
  careem: 'careem.com',
  etisalat: 'etisalat.com',
  orange: 'orange.com',
  stc: 'stc.com.sa',
  aramco: 'aramco.com',
  emirates: 'emirates.com'
};

export function clientLogoUrl(client: string): string {
  const key = client.toLowerCase().replace(/[^a-z]/g, '');
  const domain = CLIENT_DOMAINS[key];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '';
}

export function guessLogoDomain(client: string): string {
  const key = client.toLowerCase().replace(/[^a-z]/g, '');
  return CLIENT_DOMAINS[key] ?? `${key}.com`;
}
