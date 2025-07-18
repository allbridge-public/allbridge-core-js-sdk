import axios, { Axios } from "axios";
import { InvalidMessengerOptionError } from "../../exceptions";
import { ChainDetailsMapWithFlags, PoolInfoMap, PoolKeyObject } from "../../tokens-info";
import { VERSION } from "../../version";
import {
  mapChainDetailsResponseToChainDetailsMap,
  mapChainDetailsResponseToPoolInfoMap,
  mapPoolInfoResponseToPoolInfoMap,
} from "./core-api-mapper";
import {
  ChainDetailsResponse,
  GasBalanceResponse,
  Messenger,
  PendingInfoResponse,
  PoolInfoResponse,
  ReceiveTransactionCostRequest,
  ReceiveTransactionCostResponse,
  TransferStatusResponse,
} from "./core-api.model";
import { AllbridgeCoreClientParams } from "./core-client-base";

export interface TokenInfo {
  chainDetailsMap: ChainDetailsMapWithFlags;
  poolInfoMap: PoolInfoMap;
}

export interface ApiClient {
  getTokenInfo(): Promise<TokenInfo>;

  getPendingInfo(): Promise<PendingInfoResponse>;

  getGasBalance(chainSymbol: string, address: string): Promise<GasBalanceResponse>;

  getTransferStatus(chainSymbol: string, txId: string): Promise<TransferStatusResponse>;

  getReceiveTransactionCost(args: ReceiveTransactionCostRequest): Promise<ReceiveTransactionCostResponse>;

  getPoolInfoMap(pools: PoolKeyObject[] | PoolKeyObject): Promise<PoolInfoMap>;
}

export class ApiClientImpl implements ApiClient {
  private api: Axios;

  constructor(params: AllbridgeCoreClientParams) {
    this.api = axios.create({
      baseURL: params.coreApiUrl,
      headers: {
        Accept: "application/json",
        ...params.coreApiHeaders,
        "x-Sdk-Agent": "AllbridgeCoreSDK/" + VERSION,
      },
      params: params.coreApiQueryParams,
    });
  }

  async getTokenInfo(): Promise<TokenInfo> {
    const { data } = await this.api.get<ChainDetailsResponse>("/token-info", { params: { filter: "all" } });
    return {
      chainDetailsMap: mapChainDetailsResponseToChainDetailsMap(data),
      poolInfoMap: mapChainDetailsResponseToPoolInfoMap(data),
    };
  }

  async getPendingInfo(): Promise<PendingInfoResponse> {
    const { data } = await this.api.get<PendingInfoResponse>("/pending-info");
    return data;
  }

  async getGasBalance(chainSymbol: string, address: string): Promise<GasBalanceResponse> {
    const { data } = await this.api.get<GasBalanceResponse>(`/check/${chainSymbol}/${address}`);
    return data;
  }

  async getTransferStatus(chainSymbol: string, txId: string): Promise<TransferStatusResponse> {
    const { data } = await this.api.get<TransferStatusResponse>(`/chain/${chainSymbol}/${txId}`);
    return data;
  }

  async getReceiveTransactionCost(args: ReceiveTransactionCostRequest): Promise<ReceiveTransactionCostResponse> {
    if (args.messenger === Messenger.OFT && !args.sourceToken) {
      throw new InvalidMessengerOptionError("For OFT sourceToken required");
    }
    const { data } = await this.api.post<ReceiveTransactionCostResponse>("/receive-fee", args, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return {
      exchangeRate: data.exchangeRate,
      fee: data.fee,
      sourceNativeTokenPrice: data.sourceNativeTokenPrice,
      adminFeeShareWithExtras: data.adminFeeShareWithExtras,
    };
  }

  async getPoolInfoMap(pools: PoolKeyObject[] | PoolKeyObject): Promise<PoolInfoMap> {
    const poolKeys = pools instanceof Array ? pools : [pools];
    const { data } = await this.api.post<PoolInfoResponse>(
      "/pool-info",
      { pools: poolKeys },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return mapPoolInfoResponseToPoolInfoMap(data);
  }
}
