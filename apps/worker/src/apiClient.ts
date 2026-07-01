type RequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export class ApiClient {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly serviceToken: string
  ) {}

  async get(path: string): Promise<Response> {
    return fetch(`${this.apiBaseUrl}${path}`, {
      method: "GET",
      headers: {
        "x-service-token": this.serviceToken
      }
    });
  }

  async post(path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${this.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-service-token": this.serviceToken
      },
      body: JSON.stringify(body)
    });
  }

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
    const method = options.method ?? "GET";
    const response =
      method === "GET" ? await this.get(path) : await this.post(path, options.body ?? {});

    if (response.status === 204) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed: ${response.status} ${text}`);
    }
    return (await response.json()) as T;
  }
}
