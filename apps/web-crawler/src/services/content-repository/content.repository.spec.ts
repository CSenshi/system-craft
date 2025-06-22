// ToDo: Fix typescript errors throughout the file
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ContentRepository } from './content.repository';
import { ContentNotFoundException } from './content.repository.exception';

describe('ContentRepository', () => {
  let service: ContentRepository;
  let s3ClientMock: jest.Mocked<Pick<S3Client, 'send'>>;

  beforeEach(() => {
    s3ClientMock = {
      send: jest.fn(),
    };
    service = new ContentRepository(s3ClientMock as unknown as S3Client);
    process.env.AWS_S3_CONTENT_BUCKET = 'test-bucket';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeContent = (overrides = {}) => ({
    name: 'file.txt',
    body: 'hello',
    type: 'text/plain',
    ...overrides,
  });

  describe('create', () => {
    it('should call s3Client.send with correct params', async () => {
      const content = makeContent({
        name: 'nested/path/data.json',
        type: 'application/json',
        body: '{"foo": "bar"}',
      });
      await service.create(content);
      expect(s3ClientMock.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
      );
      const calledWith = s3ClientMock.send.mock.calls[0][0].input;
      expect(calledWith).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'nested/path/data.json',
        Body: '{"foo": "bar"}',
        ContentType: 'application/json',
      });
    });

    it('should throw if s3Client.send fails', async () => {
      s3ClientMock.send.mockRejectedValueOnce(new Error('S3 error'));
      const content = makeContent({ name: 'fail.txt', body: 'fail' });
      await expect(service.create(content)).rejects.toThrow('S3 error');
    });
  });

  describe('get', () => {
    it('should retrieve content from S3', async () => {
      const content = makeContent();
      const mockBody = {
        transformToString: jest.fn().mockResolvedValue(content.body),
      };
      s3ClientMock.send.mockResolvedValueOnce({
        Body: mockBody,
        ContentType: content.type,
      });

      const result = await service.get(content.name);
      expect(mockBody.transformToString).toHaveBeenCalled();
      expect(result).toEqual({ body: content.body, type: content.type });
    });

    it('should throw ContentNotFoundException if file does not exist', async () => {
      s3ClientMock.send.mockResolvedValueOnce({ Body: null });
      await expect(service.get('non-existent.txt')).rejects.toThrow(
        ContentNotFoundException,
      );
    });

    it('should throw if s3Client.send fails', async () => {
      s3ClientMock.send.mockRejectedValueOnce(new Error('S3 error'));
      await expect(service.get('fail.txt')).rejects.toThrow('S3 error');
    });
  });
});
