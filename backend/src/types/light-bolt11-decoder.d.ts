declare module "light-bolt11-decoder" {
  interface Bolt11Section {
    name?: string;
    letters?: string;
    value?: unknown;
  }

  interface DecodedBolt11 {
    paymentRequest?: string;
    sections?: Bolt11Section[];
    expiry?: number;
  }

  export default function decode(paymentRequest: string): DecodedBolt11;
}
