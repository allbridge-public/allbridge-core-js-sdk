import { Chains } from "../../chains";
import { ChainSymbol } from "../../chains/chain.enums";
import {
  ChainDetails,
  ChainDetailsMap,
  ChainDetailsMapWithFlags,
  ChainDetailsWithTokensWithFlags,
  MessengerTransferTime,
  PoolInfoMap,
  PoolKeyObject,
  TokenWithChainDetailsWithFlags,
  TransferTime,
} from "../../tokens-info";
import { calculatePoolInfoImbalance } from "../../utils/calculation";
import {
  ChainDetailsDTO,
  ChainDetailsResponse,
  Messenger,
  MessengerKeyDTO,
  MessengerTransferTimeDTO,
  PoolInfoResponse,
  TokenDTO,
  TransferTimeDTO,
} from "./core-api.model";

export function mapChainDetailsResponseToChainDetailsMap(response: ChainDetailsResponse): ChainDetailsMapWithFlags {
  return Object.entries(response).reduce<ChainDetailsMapWithFlags>((map, entry) => {
    const chainSymbol = entry[0];
    const chainDetailsDTO = entry[1];
    const chainDetails = mapChainDetailsFromDto(chainSymbol, chainDetailsDTO);
    if (chainDetails) {
      map[chainSymbol] = chainDetails;
    }
    return map;
  }, {});
}

export function mapChainDetailsResponseToPoolInfoMap(response: ChainDetailsResponse): PoolInfoMap {
  const poolInfoMap: PoolInfoMap = {};
  for (const [chainSymbolValue, chainDetailsDTO] of Object.entries(response)) {
    const chainSymbol = chainSymbolValue;
    for (const token of chainDetailsDTO.tokens) {
      const poolKey = mapPoolKeyObjectToPoolKey({
        chainSymbol,
        poolAddress: token.poolAddress,
      });
      const imbalance = calculatePoolInfoImbalance(token.poolInfo);
      poolInfoMap[poolKey] = { ...token.poolInfo, imbalance };
    }
  }
  return poolInfoMap;
}

function mapTokenWithChainDetailsFromDto(chainDetails: ChainDetails, dto: TokenDTO): TokenWithChainDetailsWithFlags {
  const { name: chainName, ...chainDetailsWithoutName } = chainDetails;
  const { poolInfo: _poolInfo, ...dtoWithoutPoolInfo } = dto;
  return {
    ...dtoWithoutPoolInfo,
    ...chainDetailsWithoutName,
    chainName,
  };
}

function mapMessengerKeyDtoToMessenger(dto: MessengerKeyDTO): Messenger | null {
  switch (dto) {
    case MessengerKeyDTO.ALLBRIDGE:
      return Messenger.ALLBRIDGE;
    case MessengerKeyDTO.WORMHOLE:
      return Messenger.WORMHOLE;
    case MessengerKeyDTO.CCTP:
      return Messenger.CCTP;
    case MessengerKeyDTO.CCTP_V2:
      return Messenger.CCTP_V2;
    case MessengerKeyDTO.OFT:
      return Messenger.OFT;
  }
}

function mapTransferTimeFromDto(dto: TransferTimeDTO): TransferTime {
  return Object.entries(dto).reduce<TransferTime>((result, [key, value]) => {
    result[key as ChainSymbol] = mapMessengerTransferTimeFromDto(value);
    return result;
  }, {});
}

function mapMessengerTransferTimeFromDto(dto: MessengerTransferTimeDTO): MessengerTransferTime {
  return Object.entries(dto).reduce<MessengerTransferTime>((messengerTransferTime, [key, value]) => {
    const messenger = mapMessengerKeyDtoToMessenger(key as MessengerKeyDTO);
    if (messenger) {
      messengerTransferTime[messenger] = value;
    }
    return messengerTransferTime;
  }, {});
}

function mapChainDetailsFromDto(chainSymbol: string, dto: ChainDetailsDTO): ChainDetailsWithTokensWithFlags | null {
  const basicChainProperties = Chains.getChainsProperties()[chainSymbol];
  if (!basicChainProperties) {
    return null;
  }
  const chainDetails: ChainDetails = {
    ...basicChainProperties,
    allbridgeChainId: dto.chainId,
    bridgeAddress: dto.bridgeAddress,
    oftBridgeAddress: dto.oftBridgeAddress,
    transferTime: mapTransferTimeFromDto(dto.transferTime),
    txCostAmount: dto.txCostAmount,
    confirmations: dto.confirmations,
    suiAddresses: dto.suiAddresses,
  };
  return {
    ...chainDetails,
    tokens: dto.tokens.map((tokenDto) => mapTokenWithChainDetailsFromDto(chainDetails, tokenDto)),
  };
}

export function mapPoolKeyToPoolKeyObject(poolKey: string): PoolKeyObject {
  const dividerPosition = poolKey.indexOf("_");
  return {
    chainSymbol: poolKey.substring(0, dividerPosition),
    poolAddress: poolKey.substring(dividerPosition + 1),
  };
}

export function mapPoolKeyObjectToPoolKey(poolKeyObject: PoolKeyObject): string {
  return poolKeyObject.chainSymbol + "_" + poolKeyObject.poolAddress;
}

export function mapChainDetailsMapToPoolKeyObjects(chainDetailsMap: ChainDetailsMap): PoolKeyObject[] {
  const result = [];
  for (const [chainSymbolValue, chainDetails] of Object.entries(chainDetailsMap)) {
    const chainSymbol = chainSymbolValue;
    for (const token of chainDetails.tokens) {
      result.push({
        chainSymbol,
        poolAddress: token.poolAddress,
      });
    }
  }
  return result;
}

export function mapPoolInfoResponseToPoolInfoMap(responseBody: PoolInfoResponse): PoolInfoMap {
  const poolInfoMap: PoolInfoMap = {};
  for (const [chainSymbolValue, poolInfoByAddress] of Object.entries(responseBody)) {
    const chainSymbol = chainSymbolValue;
    for (const [poolAddress, poolInfo] of Object.entries(poolInfoByAddress)) {
      poolInfo.imbalance = calculatePoolInfoImbalance(poolInfo);
      poolInfoMap[mapPoolKeyObjectToPoolKey({ chainSymbol, poolAddress })] = poolInfo;
    }
  }
  return poolInfoMap;
}
