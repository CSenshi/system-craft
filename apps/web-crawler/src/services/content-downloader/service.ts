import axios from 'axios';

export type Input = {
  url: string; // full URL with hostname
  ip: string; // resolved IP for that hostname
};

export type Output = {
  content: string;
  contentType: string;
};

export class Service {
  async download(
    input: Input,
  ): Promise<Output> {
    const url = new URL(input.url);
    const urlWithIp = url.protocol + '//' + input.ip + url.pathname;

    try {
      const response = await axios.get(urlWithIp, {
        headers: {
          Host: url.hostname, // Set the Host header to the original hostname
        },
        lookup: (_hostname, _opts, callback) => {
          callback(null, input.ip, 4);
        },
      });

      return {
        content: this.extractContent(response),
        contentType: this.extractContentType(response, url),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle Axios-specific errors
        throw new Error(`Failed to download content from ${input.url}: ${error.message}`);
      }
      throw new Error(`An unexpected error occurred while downloading content: ${error}`);
    }
  }

  private extractContent(response: axios.AxiosResponse): string {
    // 1. Check if the response data is a string
    if (typeof response.data === 'string') {
      return response.data;
    }

    // 2. If it's a Buffer, convert it to string
    if (Buffer.isBuffer(response.data)) {
      return response.data.toString('utf-8');
    }

    // 3. If it's an object, convert it to JSON string
    if (typeof response.data === 'object') {
      return JSON.stringify(response.data, null, 2);
    }

    // 4. Fallback to an empty string if none of the above
    return response.data?.toString() || '';
  }

  private extractContentType(response: axios.AxiosResponse, url: URL): string {
    // 1. Check if the content type is provided in the response headers
    const contentTypeHeader = response.headers['content-type'];

    if (contentTypeHeader) {
      return contentTypeHeader.toString().split(';')[0].trim();
    }

    // 2. Fallback to URL-based content type detection
    return this.determineContentTypeFromUrl(url);
  }

  private determineContentTypeFromUrl(url: URL): string {
    const contentTypeMap: [string, string][] = [
      ['.html', 'text/html'],
      ['.css', 'text/css'],
      ['.js', 'application/javascript'],
      ['.json', 'application/json'],
      ['.xml', 'application/xml'],
      ['.txt', 'text/plain'],
      ['.png', 'image/png'],
      ['.jpg', 'image/jpeg'],
      ['.jpeg', 'image/jpeg'],
      ['.gif', 'image/gif'],
      ['.svg', 'image/svg+xml'],
      ['.pdf', 'application/pdf'],
    ];

    const pathname = url.pathname.toLowerCase();

    for (const [ext, type] of contentTypeMap) {
      if (pathname.endsWith(ext)) {
        return type;
      }
    }

    return 'text/html';
  }
}
