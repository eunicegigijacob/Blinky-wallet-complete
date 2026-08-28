import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CreateInvoiceInput,
  PAYMENT_PROVIDER,
  PaymentProvider,
  WalletBalanceOutput,
} from "./providers/payment-provider.interface";

@Injectable()
export class LightningService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  createInvoice(input: CreateInvoiceInput) {
    return this.guard(() => this.provider.createInvoice(input));
  }

  getPaymentStatus(paymentHash: string) {
    return this.guard(() => this.provider.getPaymentStatus(paymentHash));
  }

  payInvoice(paymentRequest: string) {
    return this.guard(() => this.provider.payInvoice(paymentRequest));
  }

  providerHealth() {
    return this.guard(() => this.provider.health());
  }

  getWalletBalance(): Promise<WalletBalanceOutput> {
    return this.guard(() => this.provider.getWalletBalance());
  }

  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutException("Lightning provider timed out");
      }
      throw new ServiceUnavailableException("Lightning provider is unavailable");
    }
  }
}
