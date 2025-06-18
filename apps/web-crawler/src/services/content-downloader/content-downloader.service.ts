import axios from 'axios';

type ContentDownloaderServiceIn = {
  url: string; // full URL with hostname
  ip: string; // resolved IP for that hostname
};

export class ContentDownloaderService {
  async download({
    url: rawUrl,
    ip,
  }: ContentDownloaderServiceIn): Promise<string> {
    const url = new URL(rawUrl);
    const urlWithIp = url.protocol + '//' + ip + url.pathname;
    const response = await axios.get(urlWithIp, {
      headers: {
        Host: url.hostname, // Set the Host header to the original hostname
      },
      lookup: (hostname, options, callback) => {
        callback(null, ip, 4);
      },
    });

    return response.data;
  }
}
