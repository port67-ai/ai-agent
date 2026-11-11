export type EnquiryAttempt = { body: string; key: string };
export function enquiryAttempt(
  body: string,
  previous?: EnquiryAttempt,
): EnquiryAttempt {
  return previous?.body === body
    ? previous
    : { body, key: crypto.randomUUID() };
}
