export type ToxicType =
  | 'latency'
  | 'bandwidth'
  | 'slow_close'
  | 'timeout'
  | 'slicer'
  | 'limit_data';

export type ToxicStream = 'upstream' | 'downstream';

export interface ToxicAttributes {
  /** Latency in ms (for 'latency' toxic) */
  latency?: number;
  /** Jitter in ms (for 'latency' toxic) */
  jitter?: number;
  /** Rate in KB/s (for 'bandwidth' toxic) */
  rate?: number;
  /** Delay in ms before closing (for 'slow_close' toxic) */
  delay?: number;
  /** Timeout in ms (for 'timeout' toxic) */
  timeout?: number;
  /** Average size of sliced bytes (for 'slicer' toxic) */
  average_size?: number;
  /** Size variation (for 'slicer' toxic) */
  size_variation?: number;
  /** Bytes to allow before cutting (for 'limit_data' toxic) */
  bytes?: number;
}

export interface ToxicConfig {
  name: string;
  type: ToxicType;
  stream?: ToxicStream;
  toxicity?: number;
  attributes: ToxicAttributes;
}

export interface Toxic extends ToxicConfig {
  stream: ToxicStream;
  toxicity: number;
}

export interface ProxyConfig {
  name: string;
  listen: string;
  upstream: string;
  enabled?: boolean;
}

export interface Proxy extends ProxyConfig {
  enabled: boolean;
  toxics: Toxic[];
}
