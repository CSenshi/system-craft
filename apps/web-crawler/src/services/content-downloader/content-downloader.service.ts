import axios from 'axios';

export type ContentDownloaderServiceIn = {
  url: string; // full URL with hostname
  ip: string; // resolved IP for that hostname
};

export type ContentDownloaderServiceOut = {
  content: string;
  contentType: string;
};

export class ContentDownloaderService {
  async download(input: ContentDownloaderServiceIn): Promise<ContentDownloaderServiceOut> {
    const url = new URL(input.url);
    const urlWithIp = url.protocol + '//' + input.ip + url.pathname;

    const response = await axios.get(urlWithIp, {
      headers: {
        Host: url.hostname, // Set the Host header to the original hostname
      },
      lookup: (_hostname, _opts, callback) => {
        callback(null, input.ip, 4);
      },
    });

    return {
      content: response.data,
      contentType: this.extractContentType(response, url),
    };
  }

  private extractContentType(response: axios.AxiosResponse, url: URL): string {
    // 1. Check if the content type is provided in the response headers
    const contentTypeHeader = response.headers['Content-Type'];
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

