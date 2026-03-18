import type { Proxy, ProxyConfig, Toxic, ToxicConfig } from './types.js';

export class ToxiproxyClient {
  constructor(private readonly apiUrl = 'http://localhost:8474') {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Toxiproxy ${options.method ?? 'GET'} ${path} failed (${response.status}): ${body}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    // Buffer body as text first — Response bodies are single-use streams,
    // so calling .json() then .text() in a catch would always fail.
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Toxiproxy ${options.method ?? 'GET'} ${path} returned non-JSON response (${response.status}): ${text}`,
      );
    }
  }

  async getProxies(): Promise<Record<string, Proxy>> {
    return this.request<Record<string, Proxy>>('/proxies');
  }

  async createProxy(config: ProxyConfig): Promise<Proxy> {
    return this.request<Proxy>('/proxies', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getProxy(name: string): Promise<Proxy> {
    return this.request<Proxy>(`/proxies/${name}`);
  }

  async deleteProxy(name: string): Promise<void> {
    return this.request<void>(`/proxies/${name}`, { method: 'DELETE' });
  }

  async updateProxy(
    name: string,
    config: Partial<ProxyConfig>,
  ): Promise<Proxy> {
    return this.request<Proxy>(`/proxies/${name}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  }

  async disableProxy(name: string): Promise<Proxy> {
    return this.updateProxy(name, { enabled: false });
  }

  async enableProxy(name: string): Promise<Proxy> {
    return this.updateProxy(name, { enabled: true });
  }

  async addToxic(proxyName: string, toxic: ToxicConfig): Promise<Toxic> {
    return this.request<Toxic>(`/proxies/${proxyName}/toxics`, {
      method: 'POST',
      body: JSON.stringify({
        ...toxic,
        stream: toxic.stream ?? 'downstream',
        toxicity: toxic.toxicity ?? 1.0,
      }),
    });
  }

  async getToxics(proxyName: string): Promise<Toxic[]> {
    return this.request<Toxic[]>(`/proxies/${proxyName}/toxics`);
  }

  async removeToxic(proxyName: string, toxicName: string): Promise<void> {
    return this.request<void>(`/proxies/${proxyName}/toxics/${toxicName}`, {
      method: 'DELETE',
    });
  }

  async updateToxic(
    proxyName: string,
    toxicName: string,
    toxic: Partial<ToxicConfig>,
  ): Promise<Toxic> {
    return this.request<Toxic>(`/proxies/${proxyName}/toxics/${toxicName}`, {
      method: 'PATCH',
      body: JSON.stringify(toxic),
    });
  }

  async reset(): Promise<void> {
    return this.request<void>('/reset', { method: 'POST' });
  }

  async resetProxy(proxyName: string): Promise<void> {
    const toxics = await this.getToxics(proxyName);
    await Promise.all(toxics.map((t) => this.removeToxic(proxyName, t.name)));
    await this.enableProxy(proxyName);
  }

  async ensureProxy(config: ProxyConfig): Promise<Proxy> {
    try {
      return await this.createProxy(config);
    } catch (error) {
      if (error instanceof Error && error.message.includes('409')) {
        await this.resetProxy(config.name);
        return this.getProxy(config.name);
      }
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/version`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
